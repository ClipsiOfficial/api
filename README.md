# API - README

## Descripción

- API para el proyecto PAE. Proporciona endpoints REST para autenticación, gestión de recursos y consultas necesarias para la aplicación cliente.

## Instalación

```bash
# Clonar el repositorio
git clone https://github.com/ClipsiOfficial/api .
cd api

# Instalar dependencias
pnpm install

# Ejecución
pnpm start
```

## Linter (ESLint)

Usamos ESLint con la configuración proporcionada en el proyecto. Hay scripts en `package.json` para ejecutar el linter y corregir automáticamente algunos problemas.

- Ejecutar linter:

```bash
pnpm lint
```

- Ejecutar linter y aplicar correcciones automáticas:

```bash
pnpm lint:fix
```

Notas:

- Si quieres integrar ESLint con tu editor (VS Code), instala la extensión ESLint y habilita `auto fix on save` si lo deseas.
- El proyecto usa reglas compartidas (`@antfu/eslint-config`) y algunas reglas personalizadas; revisa el archivo de configuración del proyecto si necesitas ajustar reglas.

## Drizzle Studio (Development vs Production)

Drizzle Studio es una interfaz útil para explorar tu esquema y datos SQLite/D1 durante el desarrollo.

### Ejecutar Drizzle Studio en desarrollo

Usa el script que abre Studio apuntando al entorno de desarrollo local (no afectará la base remota):

```bash
pnpm db:studio
```

Esto lanza una interfaz web donde puedes navegar tablas, ejecutar queries y revisar el esquema. Por defecto `drizzle-kit` carga la configuración de `drizzle.config.ts` y, gracias a la configuración del proyecto, en desarrollo usará las credenciales locales configuradas en `.env`.

### Ejecutar Drizzle Studio contra producción (solo lectura/administración)

Si necesitas abrir Studio apuntando a la base de datos remota (production), puedes usar:

```bash
pnpm db:studio:prod
```

Advertencias y diferencias entre dev y prod:

- Credenciales:
  - Dev: `drizzle.config.ts` está configurado para leer valores locales (por ejemplo `sqlite` local o archivo `.env`) y usar `sqliteLocalFileCredentials` cuando no está en producción.
  - Prod: Se usa `d1-http` + `dbCredentials` con las credenciales de Cloudflare. Asegúrate de no exponer estas credenciales públicamente.

- Migraciones y schema:
  - En dev puedes generar migraciones con `pnpm drizzle-kit generate` y aplicarlas localmente.
  - Para aplicar en la base de datos D1 remota usa `pnpm drizzle-kit push` (la `drizzle.config.ts` aplicará `d1-http` con las credenciales de producción si `NODE_ENV=production`).

- Source maps / seguridad:
  - En dev puedes habilitar source maps para debugging (`pnpm dev:debug`).
  - En producción los source maps están desactivados por defecto por razones de seguridad. No publiques source maps de producción.

## Equipo

El equipo esta compuesto por:
- Ariadna Mantilla
- Eulalia Peiret
- Ivan Moreno
- Laura Apolzan
