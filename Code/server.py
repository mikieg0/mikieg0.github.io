import json
import os
import re
import threading
import time
from decimal import Decimal, InvalidOperation
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parent
RATE_LIMIT_WINDOW = 60
RATE_LIMIT_MAX_REQUESTS = 5
_rate_limit_lock = threading.Lock()
_recent_requests = {}


class RequestError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status


def whatsapp_configured():
    required = (
        "WHATSAPP_ACCESS_TOKEN",
        "WHATSAPP_PHONE_NUMBER_ID",
        "WHATSAPP_TEMPLATE_NAME",
        "WHATSAPP_TEMPLATE_LANGUAGE",
        "WHATSAPP_API_VERSION",
        "WHATSAPP_DESTINATION_PHONE",
    )
    if not all(os.environ.get(key, "").strip() for key in required):
        return False
    try:
        normalize_phone(os.environ["WHATSAPP_DESTINATION_PHONE"])
    except RequestError:
        return False
    return True


def normalize_phone(value):
    value = value.strip()
    if not re.fullmatch(r"\+?[0-9\s().-]+", value):
        raise RequestError(400, "Ingresa un número de WhatsApp válido con código de país.")
    phone = re.sub(r"\D", "", value)
    if phone.startswith("00"):
        phone = phone[2:]
    if len(phone) == 9 and phone.startswith("9"):
        phone = "51" + phone
    if not 8 <= len(phone) <= 15 or phone.startswith("0"):
        raise RequestError(400, "Ingresa un número de WhatsApp válido con código de país.")
    return phone


def validate_request(payload):
    if not isinstance(payload, dict):
        raise RequestError(400, "Los datos del pedido no son válidos.")

    business_phone = payload.get("businessPhone")
    customer_phone = payload.get("customerPhone")
    name = payload.get("customerName")
    order_id = payload.get("orderId")
    business_name = payload.get("businessName")
    method = payload.get("method")
    delivery_at = payload.get("deliveryAt")
    address = payload.get("address", "")
    zone = payload.get("zone", "")
    instructions = payload.get("instructions", "")
    items = payload.get("items")

    if not all(isinstance(value, str) for value in (
        business_phone, customer_phone, name, order_id, business_name, method, delivery_at,
        address, zone, instructions,
    )):
        raise RequestError(400, "Faltan datos válidos para enviar el pedido.")

    name = name.strip()
    business_name = business_name.strip()
    if not name or len(name) > 80 or any(ord(char) < 32 for char in name):
        raise RequestError(400, "El nombre del cliente o del negocio no es válido.")
    if not business_name or len(business_name) > 80 or any(ord(char) < 32 for char in business_name):
        raise RequestError(400, "El nombre del cliente o del negocio no es válido.")
    if not re.fullmatch(r"MD-\d{7}", order_id):
        raise RequestError(400, "El identificador del pedido no es válido.")
    if method not in ("Delivery", "Recojo en tienda"):
        raise RequestError(400, "El método de entrega no es válido.")

    destination_phone = normalize_phone(os.environ["WHATSAPP_DESTINATION_PHONE"])
    if normalize_phone(business_phone) != destination_phone:
        raise RequestError(409, "El WhatsApp de Administración no coincide con el número de destino configurado en el servidor.")
    customer_phone = normalize_phone(customer_phone)

    def clean_text(value, label, maximum):
        value = value.strip()
        if len(value) > maximum or any(ord(char) < 32 and char not in "\n\t" for char in value):
            raise RequestError(400, f"El campo {label} no es válido.")
        return value

    delivery_at = clean_text(delivery_at, "fecha de entrega", 80)
    address = clean_text(address, "dirección", 200)
    zone = clean_text(zone, "zona de entrega", 80)
    instructions = clean_text(instructions, "indicaciones", 200)
    if method == "Delivery" and (not address or not zone):
        raise RequestError(400, "Faltan la dirección o la zona del pedido.")
    if not isinstance(items, list) or not items or len(items) > 20:
        raise RequestError(400, "La lista de productos no es válida.")

    item_lines = []
    subtotal = Decimal("0.00")
    for item in items:
        if not isinstance(item, dict):
            raise RequestError(400, "La lista de productos no es válida.")
        item_name = item.get("name")
        quantity = item.get("quantity")
        price = item.get("price")
        if not isinstance(item_name, str):
            raise RequestError(400, "El nombre de un producto no es válido.")
        item_name = clean_text(item_name, "producto", 80)
        if not item_name:
            raise RequestError(400, "El nombre de un producto no es válido.")
        if not isinstance(quantity, int) or isinstance(quantity, bool) or not 1 <= quantity <= 99:
            raise RequestError(400, "La cantidad de un producto no es válida.")
        if isinstance(price, bool) or not isinstance(price, (int, float)):
            raise RequestError(400, "El precio de un producto no es válido.")
        try:
            unit_price = Decimal(str(price)).quantize(Decimal("0.01"))
        except InvalidOperation:
            raise RequestError(400, "El precio de un producto no es válido.") from None
        if not unit_price.is_finite() or unit_price < 0:
            raise RequestError(400, "El precio de un producto no es válido.")
        line_total = unit_price * quantity
        subtotal += line_total
        item_lines.append(f"- {item_name.strip()} x{quantity}: S/ {line_total:.2f}")

    try:
        submitted_subtotal = Decimal(str(payload.get("subtotal"))).quantize(Decimal("0.01"))
        delivery_fee = Decimal(str(payload.get("deliveryFee"))).quantize(Decimal("0.01"))
        submitted_total = Decimal(str(payload.get("total"))).quantize(Decimal("0.01"))
    except InvalidOperation:
        raise RequestError(400, "El total del pedido no es válido.") from None
    amounts = (submitted_subtotal, delivery_fee, submitted_total)
    if not all(value.is_finite() and value >= 0 for value in amounts):
        raise RequestError(400, "El total del pedido no es válido.")
    if subtotal != submitted_subtotal or subtotal + delivery_fee != submitted_total:
        raise RequestError(400, "Los importes del pedido no coinciden.")

    summary = [
        f"Pedido {order_id} - {business_name}",
        f"Cliente: {name}",
        f"WhatsApp del cliente: +{customer_phone}",
        *item_lines,
        f"Subtotal: S/ {subtotal:.2f}",
        f"{'Delivery' if method == 'Delivery' else 'Recojo'}: S/ {delivery_fee:.2f}",
        f"TOTAL: S/ {submitted_total:.2f}",
        f"Fecha y hora: {delivery_at}",
    ]
    if method == "Delivery":
        summary.extend((f"Dirección: {address}", f"Zona: {zone}"))
    if instructions:
        summary.append(f"Indicaciones: {instructions}")
    message = "\n".join(summary)
    if len(message) > 1024:
        raise RequestError(400, "El resumen del pedido es demasiado largo para enviarlo por WhatsApp.")
    return {
        "phone": destination_phone,
        "business_name": business_name,
        "message": message,
    }


def send_whatsapp_template(order):
    version = os.environ["WHATSAPP_API_VERSION"].strip()
    phone_number_id = os.environ["WHATSAPP_PHONE_NUMBER_ID"].strip()
    if not re.fullmatch(r"v\d+\.\d+", version) or not re.fullmatch(r"\d+", phone_number_id):
        raise RequestError(503, "La configuración de WhatsApp del servidor no es válida.")
    if not re.fullmatch(r"[a-z0-9_]{1,512}", os.environ["WHATSAPP_TEMPLATE_NAME"].strip()):
        raise RequestError(503, "El nombre de la plantilla de WhatsApp no es válido.")
    if not re.fullmatch(r"[a-z]{2}(?:_[A-Z]{2})?", os.environ["WHATSAPP_TEMPLATE_LANGUAGE"].strip()):
        raise RequestError(503, "El idioma de la plantilla de WhatsApp no es válido.")

    body = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": order["phone"],
        "type": "template",
        "template": {
            "name": os.environ["WHATSAPP_TEMPLATE_NAME"].strip(),
            "language": {"code": os.environ["WHATSAPP_TEMPLATE_LANGUAGE"].strip()},
            "components": [
                {
                    "type": "body",
                    "parameters": [
                        {"type": "text", "text": order["business_name"]},
                        {"type": "text", "text": order["message"]},
                    ],
                }
            ],
        },
    }
    request = Request(
        f"https://graph.facebook.com/{version}/{phone_number_id}/messages",
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {os.environ['WHATSAPP_ACCESS_TOKEN'].strip()}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=15) as response:
            result = json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        error.close()
        raise RequestError(502, "Meta rechazó el mensaje. Revisa el token, el número y la plantilla aprobada.") from None
    except (URLError, TimeoutError):
        raise RequestError(502, "No se pudo conectar con WhatsApp. Inténtalo de nuevo más tarde.") from None
    except (UnicodeDecodeError, json.JSONDecodeError):
        raise RequestError(502, "WhatsApp devolvió una respuesta no válida.") from None

    messages = result.get("messages") if isinstance(result, dict) else None
    if not isinstance(messages, list) or not messages or not isinstance(messages[0], dict) or not messages[0].get("id"):
        raise RequestError(502, "WhatsApp no confirmó la aceptación del mensaje.")
    return messages[0]["id"]


class BakeryRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def _send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if urlsplit(self.path).path == "/api/health":
            self._send_json(200, {"whatsappConfigured": whatsapp_configured()})
            return
        super().do_GET()

    def _check_rate_limit(self):
        now = time.monotonic()
        address = self.client_address[0]
        with _rate_limit_lock:
            stale_addresses = [
                client for client, stamps in _recent_requests.items()
                if not stamps or now - stamps[-1] >= RATE_LIMIT_WINDOW
            ]
            for client in stale_addresses:
                del _recent_requests[client]
            recent = [stamp for stamp in _recent_requests.get(address, []) if now - stamp < RATE_LIMIT_WINDOW]
            if len(recent) >= RATE_LIMIT_MAX_REQUESTS:
                _recent_requests[address] = recent
                raise RequestError(429, "Se alcanzó el límite de envíos. Espera un minuto e inténtalo de nuevo.")
            recent.append(now)
            _recent_requests[address] = recent

    def do_POST(self):
        if urlsplit(self.path).path != "/api/send-whatsapp":
            self._send_json(404, {"error": "Ruta no encontrada."})
            return

        origin = self.headers.get("Origin")
        if origin:
            parsed_origin = urlsplit(origin)
            if parsed_origin.scheme not in ("http", "https") or parsed_origin.netloc.lower() != self.headers.get("Host", "").lower():
                self._send_json(403, {"error": "Origen de solicitud no permitido."})
                return

        try:
            if not whatsapp_configured():
                raise RequestError(503, "El envío de WhatsApp aún no está configurado en el servidor.")
            self._check_rate_limit()

            if self.headers.get_content_type() != "application/json":
                raise RequestError(415, "La solicitud debe enviarse como JSON.")
            try:
                content_length = int(self.headers.get("Content-Length", "0"))
            except ValueError:
                raise RequestError(400, "El tamaño de la solicitud no es válido.") from None
            if content_length <= 0 or content_length > 16_384:
                raise RequestError(413, "El tamaño de la solicitud no es válido.")

            try:
                payload = json.loads(self.rfile.read(content_length).decode("utf-8"))
            except (UnicodeDecodeError, json.JSONDecodeError):
                raise RequestError(400, "El cuerpo de la solicitud no contiene JSON válido.") from None

            order = validate_request(payload)
            message_id = send_whatsapp_template(order)
            self._send_json(200, {"accepted": True, "messageId": message_id})
        except RequestError as error:
            self._send_json(error.status, {"error": str(error)})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8000"))
    server = ThreadingHTTPServer(("127.0.0.1", port), BakeryRequestHandler)
    print(f"Miga Dorada disponible en http://127.0.0.1:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido.")
    finally:
        server.server_close()
