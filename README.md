# MULTISHOP

Tienda digital profesional (Free Fire y Streaming) construida con **Next.js 16 + Supabase**.
Diseño premium negro / morado neón / violeta, responsive y con panel administrador completo.

## Estado del proyecto

El código está completo y compila (`npm run build`, 51 rutas). Para que la tienda
funcione de verdad contra tu base de datos falta **un solo paso de instalación** que
solo se puede hacer desde tu cuenta de Supabase:

### 1. Aplicar el esquema de la base de datos

1. Abre tu proyecto en <https://supabase.com/dashboard>.
2. Ve a **SQL Editor → New query**.
3. Pega el contenido completo de [`supabase/schema.sql`](supabase/schema.sql) y pulsa **Run**.

El script es idempotente (se puede ejecutar varias veces sin perder datos). Crea:

- 18 tablas (perfiles, categorías, subcategorías, productos, carritos, pedidos,
  detalles, pagos, saldos, movimientos, notificaciones, soporte, configuración,
  banners, copias de seguridad, eventos, registros administrativos).
- Políticas **RLS** en las 18 tablas, triggers de perfil automático y funciones de apoyo.
- Buckets de Storage para imágenes (`media`) y comprobantes (`comprobantes`).
- Las **dos categorías iniciales**: FREE FIRE y STREAMING, con sus subcategorías
  (Diamantes, Pases, Membresías, Cuentas FF, Otros · Netflix, YouTube Premium,
  Spotify, Otros servicios).

Sin este paso la tienda muestra el aviso "Configuración pendiente" y el catálogo
aparece vacío (`PGRST205: Could not find the table 'public.categories'`).

### 2. Variables de entorno

La tienda solo necesita las credenciales **públicas** de Supabase (ya configuradas
en AppJet → Settings → Environment variables):

| Variable | Dónde se obtiene |
| --- | --- |
| `SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | Supabase → Project Settings → API → `anon` `public` |

También se admiten los nombres de convención Next.js `NEXT_PUBLIC_SUPABASE_URL` /
`NEXT_PUBLIC_SUPABASE_ANON_KEY`.

No se usa ninguna clave privada: cada pedido, cambio del panel, subida de imagen y
copia de seguridad se ejecuta en el servidor con la **sesión del usuario** y las
políticas RLS (`public.is_admin()` habilita el panel). La compra completa vive en la
función de Postgres `create_order_from_cart`, que valida precios, stock y saldo
dentro de la base de datos.

### 3. Nombrar tu cuenta administradora

Regístrate en la tienda y luego, en **SQL Editor**, ejecuta con tu correo:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'tu-correo@ejemplo.com');
```

Entra en `/admin`. La tienda pública y el panel comparten la misma sesión: el rol
`admin` es lo que habilita el panel.

## Ejecutar en local

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # compilación de producción
```

Las credenciales se leen del entorno (`.env.local` en local, Settings en AppJet).
No subas claves al repositorio.

## Rutas principales

| Tienda | Panel administrador |
| --- | --- |
| `/` inicio | `/admin` dashboard |
| `/categoria/[slug]` | `/admin/productos`, `/admin/categorias`, `/admin/subcategorias` |
| `/producto/[slug]` | `/admin/clientes`, `/admin/pedidos`, `/admin/pagos` |
| `/carrito`, `/checkout` | `/admin/saldos`, `/admin/promociones`, `/admin/soporte` |
| `/mis-compras`, `/saldo` | `/admin/configuracion`, `/admin/mantenimiento` |
| `/cuenta`, `/login`, `/registro` | `/admin/actividad`, `/admin/backups` |
| `/configuracion` (diagnóstico) | |

`/configuracion` muestra en vivo el estado de la conexión y del esquema, con los
pasos que falten.

## Copias de seguridad

`/admin/backups` permite crear, descargar, restaurar y eliminar copias reales:

- Incluye datos de tienda: productos, categorías, subcategorías, pedidos, detalles,
  configuración, banners, saldos y movimientos.
- Antes de restaurar se crea automáticamente una copia del estado actual.
- Verifica integridad del JSON y guarda historial de eventos.
- **No** incluye usuarios de Auth ni los archivos de Storage: esos requieren un
  respaldo independiente desde Supabase (Auth → Users export y Storage → bucket).

## Seguridad

- Roles `admin` / `cliente` con RLS; el servidor no guarda ninguna clave privada.
- El checkout corre en `create_order_from_cart`: precios, stock y saldo se validan
  en Postgres, así que el navegador no puede alterar importes ni duplicar pedidos.
- Triggers `profiles_guard`, `orders_guard` y `payments_guard` impiden que un cliente
  cambie su saldo, su rol o el estado de pago de un pedido.
- Compras bloqueadas en el servidor cuando el modo mantenimiento está activo.
- Verificación de pagos antes de confirmar pedidos y protección contra duplicados.
- Registro de operaciones administrativas en `admin_logs`.

## Despliegue

El `Dockerfile` usa `node:26-alpine`, corre como usuario no root (10001), escucha
en el puerto `3000` y ejecuta `npm start`. El despliegue se realiza desde AppJet
sobre la rama `appjet`.
