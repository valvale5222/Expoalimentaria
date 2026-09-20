# Registro de leads

Aplicación React + Vite con Supabase (Postgres, Auth y Storage), inspirada en el flujo de hermetica-leads-expo.web.app. Nombre y marca provisionales confirmados: Registro de leads.

## Desarrollo

Requiere Node.js 22.12+.

```sh
npm install
npm run dev
```

Abrir http://127.0.0.1:5173. `npm run build` genera `dist/`.

Sin variables de Supabase se activa una demostración en memoria. No guarda datos en una base de datos ni en localStorage y se reinicia al recargar o cerrar sesión. El acceso por nombre existe solo en esta demostración. No introducir contactos reales en ella.

## Conectar un proyecto nuevo de Supabase

1. Iniciar sesión en https://supabase.com/dashboard y crear un proyecto dentro de tu organización. Elegir nombre, región y una contraseña de base de datos propia; no compartir esa contraseña en el chat.
2. Ejecutar `supabase/migrations/202609200001_initial.sql` en el SQL Editor del proyecto nuevo. Crea las tablas, el bucket privado de fotos, el trigger de perfiles y las políticas de acceso.
3. En Authentication, desactivar los registros públicos y crear los usuarios del equipo desde el panel. El trigger asigna el rol `advisor` a cada usuario nuevo. Crear usuarios DESPUÉS de ejecutar la migración.
4. Desde el SQL Editor, asignar nombres y el administrador usando sus UUID reales. Solo el administrador del proyecto realiza esto:

```sql
update public.profiles set full_name = 'Nombre del asesor' where id = 'UUID-DEL-USUARIO';
update public.profiles set role = 'admin' where id = 'UUID-DEL-ADMINISTRADOR';
```

5. Copiar `.env.example` a `.env.local` y completar la URL del proyecto y su clave **publishable** (o anon del proyecto). Nunca usar service_role o una clave secreta en el frontend.
6. Reiniciar el servidor de desarrollo. Aparecerá el acceso con correo y contraseña.

Los asesores consultan e insertan sus propios leads. Los administradores consultan los de todo el equipo y su ranking. Nadie puede asignarse un rol desde el navegador. No hay edición ni eliminación de leads en esta primera versión. Las fotografías se guardan en un bucket privado y se muestran con enlaces temporales de 10 minutos. Al fallar un insert se intenta retirar su foto huérfana.

## Acceso por código sin cuentas para el equipo

El acceso de la aplicación usa el selector de nombre y un código personal. La Edge Function `supabase/functions/app-login/index.ts` crea o reutiliza una identidad técnica permanente en Supabase Auth; los usuarios no necesitan conocer ni administrar una cuenta de Supabase.

Requiere Supabase CLI y un proyecto enlazado:

```sh
supabase functions deploy app-login --no-verify-jwt
```

Después de desplegarla, desactivar Anonymous Sign-Ins en Authentication. La función usa las variables administradas por Supabase (`SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`) y nunca expone la clave `service_role` al navegador.

## Alcance inicial

- Inicio con conteos del asesor (día de Lima y total).
- Formulario con los ocho campos principales de la referencia, DNI y comentario opcionales, detalle de repuestos y foto opcional.
- Lista, búsqueda, ficha del contacto y ranking diario para administradores.
- Estados vacíos, carga, errores y confirmación de guardado.
- Diseño responsive azul y blanco. El catálogo inicial replica la referencia y se puede cambiar en `src/main.jsx`.

## Validación pendiente de cuenta real

La integración no se considera verificada hasta aplicar la migración y probar con dos asesores y un administrador: el asesor A no debe leer leads/fotos de B; el administrador sí puede consultar ambos; una petición sin sesión debe fallar; insertar con owner_id ajeno debe fallar. Comprobar también guardado, foto, recarga y cierre de sesión.

La selección de nombres y los privilegios basados en el nombre de la referencia se reemplazan por Supabase Auth y RLS en la versión conectada. El enlace a su cotizador y sus marcas no se incluyen porque corresponden al negocio de la referencia.
