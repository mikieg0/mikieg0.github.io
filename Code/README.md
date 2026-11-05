# Miga Dorada — demostración de tienda para panadería

Sitio responsive en español con catálogo, búsqueda, filtros, favoritos, carrito, entrega programada, horarios, pedidos e historial local. No requiere paquetes externos.

## Abrir el sitio

El envío de WhatsApp necesita el servidor incluido; abrir `index.html` directamente en el navegador solo permite ver la demostración.

1. Configura las variables de entorno indicadas en **Activar el envío de WhatsApp**.
2. Desde esta carpeta ejecuta:

   ```powershell
   python server.py
   ```

3. Abre `http://127.0.0.1:8000`.

## Activar el envío de WhatsApp

Cada pedido envía automáticamente su resumen al WhatsApp de la panadería configurado en **Administración → Negocio**. El WhatsApp del cliente se incluye en el resumen para que puedas contactarlo y gestionar el pedido. La API de Meta debe aceptar el mensaje; eso no garantiza que WhatsApp lo haya entregado. El pedido permanece pendiente hasta que la panadería lo confirme.

Necesitas una cuenta de WhatsApp Business Platform, un número habilitado, el **Phone Number ID**, un token de acceso de servidor con el permiso `whatsapp_business_messaging` y una plantilla de tipo utilidad aprobada por Meta. En el administrador de plantillas crea una plantilla con el idioma que vas a configurar y este texto exacto:

> Nuevo pedido para gestionar en {{1}}:  
> {{2}}  
> Revisa y confirma el pedido desde WhatsApp.

El nombre de la plantilla predeterminado puede ser `order_confirmation`; debe coincidir con `WHATSAPP_TEMPLATE_NAME`. En **Administración → Negocio**, escribe el número de la panadería sin `+51` (por ejemplo, `987654321`). `WHATSAPP_DESTINATION_PHONE` debe ser ese mismo número con código de país (por ejemplo, `51987654321`). Ese es el número que recibe todos los pedidos; no se envían mensajes al cliente. Usa como destinatario un WhatsApp que puedas gestionar y que no sea el mismo número conectado como emisor de la API. Configura las credenciales en PowerShell **antes de iniciar el servidor** (usa la versión Graph API vigente que tengas habilitada):

```powershell
$env:WHATSAPP_ACCESS_TOKEN = "tu_token_de_acceso"
$env:WHATSAPP_PHONE_NUMBER_ID = "tu_phone_number_id"
$env:WHATSAPP_TEMPLATE_NAME = "order_confirmation"
$env:WHATSAPP_TEMPLATE_LANGUAGE = "es_PE"
$env:WHATSAPP_API_VERSION = "vXX.X"
$env:WHATSAPP_DESTINATION_PHONE = "51987654321"
python server.py
```

No escribas el token en `app.js`, en el navegador ni en un archivo que publiques. En producción, guarda los secretos en el gestor de secretos del alojamiento y sirve el sitio y `/api/send-whatsapp` desde el mismo origen HTTPS (por ejemplo, mediante un proxy inverso). El servidor local escucha solo en `127.0.0.1`.

El servidor limita los intentos a cinco por minuto por dirección IP y solo acepta la plantilla configurada. Si falla el envío, el pedido queda guardado localmente y la pantalla permite reintentarlo. La API y el historial local no comparten pedidos entre dispositivos. Antes de recibir pedidos reales, conecta una base de datos, valida pedidos y stock en el servidor y añade controles antiabuso adecuados para el alojamiento.

## Datos de demostración

- **Panadería:** Miga Dorada; nombre, dirección, WhatsApp, horarios, tarifas y productos son ilustrativos.
- **Stock:** editable desde **Administración → Productos**.
- **Panel:** botón **Administración** en el encabezado o pie de página. Contraseña de ejemplo: `horno2026`.
- **Persistencia:** productos, cambios administrativos, favoritos, carrito e historial de pedidos se guardan en `localStorage` del navegador actual.
- **WhatsApp de contacto:** los accesos de contacto siguen abriendo WhatsApp para que el usuario inicie la conversación. Cada pedido se envía por la API al WhatsApp de la panadería configurado en Administración.
- **Imágenes:** el catálogo inicial usa imágenes de muestra de Unsplash. El panel permite pegar una URL pública o subir una imagen de hasta 1 MB.
- **Horarios:** los pedidos programados se validan contra el día y la hora configurados. La demostración no dispone de calendario de feriados.

## Antes de usar en producción

La contraseña del panel está en el código del navegador y **no es autenticación segura**. Los pedidos siguen guardándose en el navegador y no generan reservas compartidas ni notificaciones de administrador. El servidor de WhatsApp no sustituye una API de pedidos segura; usa HTTPS, gestión segura de credenciales, almacenamiento compartido y controles de abuso antes de publicar la tienda.
