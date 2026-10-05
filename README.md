# Práctica Semana 4 – Servidor GraphQL con NestJS

**Autor:** Anthony Rosero
**Curso:** Integración de Sistemas – PUCE

## 1. Descripción

Servidor GraphQL (enfoque *code-first*) construido con NestJS y Apollo que expone el catálogo de productos. Primero se sirvió desde un arreglo en memoria y luego se conectó a la API REST real desplegada en Render (`https://nestjs-productos-api.onrender.com/api/v1/productos`) mediante `HttpService` de `@nestjs/axios`. El esquema `schema.gql` se genera automáticamente en la raíz del proyecto.

### Stack (versiones exactas instaladas)

| Paquete | Versión |
|---|---|
| Node.js (local) | 26.1.0 (Render: NODE_VERSION 24) |
| @nestjs/core / @nestjs/common | 12.1.2 |
| @nestjs/graphql | 14.0.3 |
| @nestjs/apollo | 14.0.3 |
| @apollo/server | 5.5.1 |
| @as-integrations/express5 | 1.1.2 |
| graphql | 16.14.2 |
| @nestjs/axios | 12.0.1 |
| axios | 1.20.0 |
| rxjs | 7.8.2 |
| Módulos | ESM (`"type": "module"`, `module: nodenext`), pruebas con vitest |

## 2. Cómo ejecutar

```bash
npm install
npm run start:dev
```

Abrir **http://localhost:3000/graphql** (explorador de Apollo) y ejecutar, por ejemplo:

```graphql
query { productos { id nombre precio } }
query { productoPorId(id: 3) { id nombre precio } }
query { productos { nombre } }
query { productoPorId(id: 4) { nombre } }
query { productosBaratos(precioMaximo: 50) { nombre precio } }
query { productos { nombre } productoPorId(id: 4) { id nombre precio } }
```

Producción: `npm run build` y `npm run start:prod` (usa `process.env.PORT ?? 3000`).

### Esquema generado (`schema.gql`)

```graphql
type Producto {
  id: Int!
  nombre: String!
  precio: Float!
}

type Query {
  productos: [Producto!]!
  productoPorId(id: Int!): Producto
  productosBaratos(precioMaximo: Float!): [Producto!]!
}
```

## 3. Resultados por paso (respuestas reales)

### Pasos 2 y 3 – Tipo, resolver en memoria y AppModule

- `npm run build`: sin errores.
- Log: `GraphQLModule dependencies initialized`, `Mapped {/graphql, POST} route`, `Nest application successfully started`.
- `schema.gql` generado en la **raíz** del proyecto (no en `src`).

### Pasos 4 y 5 – Queries con datos en memoria

1. `query { productos { id nombre precio } }`
```json
{ "data": { "productos": [
  { "id": 1, "nombre": "Teclado mecánico", "precio": 45.9 },
  { "id": 3, "nombre": "Teclado inalámbrico hp", "precio": 75.5 },
  { "id": 4, "nombre": "MacBook Pro", "precio": 3500 } ] } }
```
2. `query { productoPorId(id: 3) { id nombre precio } }`
```json
{ "data": { "productoPorId": { "id": 3, "nombre": "Teclado inalámbrico hp", "precio": 75.5 } } }
```
3. `query { productoPorId(id: 2) { nombre } }`
```json
{ "data": { "productoPorId": null } }
```
4. `query { productos { nombre } }` (solo nombres, sin id ni precio)
```json
{ "data": { "productos": [
  { "nombre": "Teclado mecánico" }, { "nombre": "Teclado inalámbrico hp" }, { "nombre": "MacBook Pro" } ] } }
```
5. `query { productoPorId(id: 4) { nombre } }`
```json
{ "data": { "productoPorId": { "nombre": "MacBook Pro" } } }
```

### Paso 6 – Conexión a la API REST real

- Log: `HttpModule dependencies initialized`, `GraphQLModule dependencies initialized`, sin `UnknownDependenciesException`.
- La API REST en Render (plan gratis) tardó ~33 s en despertar en la primera petición.
- Las queries 1, 2 y 5 devolvieron **exactamente lo mismo** que con datos en memoria, ahora desde la API.
- `query { productoPorId(id: 2) { nombre } }` ahora devuelve error (esperado: la API REST responde 404):
```json
{ "errors": [ { "message": "Request failed with status code 404",
    "path": ["productoPorId"],
    "extensions": { "code": "INTERNAL_SERVER_ERROR" } } ],
  "data": { "productoPorId": null } }
```

### Paso 7 – Reto `productosBaratos`

- `query { productosBaratos(precioMaximo: 50) { nombre precio } }`
```json
{ "data": { "productosBaratos": [ { "nombre": "Teclado mecánico", "precio": 45.9 } ] } }
```
- `query { productosBaratos(precioMaximo: 100) { nombre precio } }`
```json
{ "data": { "productosBaratos": [
  { "nombre": "Teclado mecánico", "precio": 45.9 },
  { "nombre": "Teclado inalámbrico hp", "precio": 75.5 } ] } }
```

## 4. Comparación REST vs GraphQL

Necesidad: *todos los productos (solo nombres) más el detalle del producto 4*.

**REST:** 2 llamadas y objetos completos (overfetching: llegan `id` y `precio` aunque solo se quieren nombres):

```
GET /api/v1/productos     -> [{id, nombre, precio}, {id, nombre, precio}, {id, nombre, precio}]
GET /api/v1/productos/4   -> {id, nombre, precio}
```

**GraphQL:** 1 sola petición pidiendo solo los campos necesarios:

```graphql
query { productos { nombre } productoPorId(id: 4) { id nombre precio } }
```

Respuesta real:

```json
{ "data": {
  "productos": [ { "nombre": "Teclado mecánico" }, { "nombre": "Teclado inalámbrico hp" }, { "nombre": "MacBook Pro" } ],
  "productoPorId": { "id": 4, "nombre": "MacBook Pro", "precio": 3500 } } }
```

## 5. Qué cambió en el Paso 6

- **Antes:** el resolver devolvía el arreglo `catalogo` en memoria.
- **Ahora:** el resolver inyecta `HttpService` (registrado con `HttpModule.register({})`) y consulta la API REST con `firstValueFrom(this.http.get(...))`.
- La **forma de la query no cambió** (mismo esquema y mismos argumentos); solo cambió de dónde vienen los datos.

## 6. Errores típicos y cómo se evitan

| Error | Causa | Solución |
|---|---|---|
| `ERR_MODULE_NOT_FOUND` al arrancar | Proyecto ESM (`nodenext`): imports relativos sin extensión | Todos los imports relativos terminan en `.js` (`'./producto.model.js'`) |
| `Duplicate identifier` | Llamar `productos` tanto al arreglo como al método `productos()` | El arreglo se llama `catalogo` y el método `productos()` |
| Falla al iniciar Apollo con Express 5 | Falta la integración de Apollo para Express 5 | Instalar `@as-integrations/express5` (obligatorio) |
| `UnknownDependenciesException` (HttpService) | `HttpModule` no importado en el módulo | Agregar `HttpModule.register({})` dentro de `imports` |
| `productoPorId(id: 2)` → `null` / error 404 | El id 2 no existe (en memoria da `null`; con la API REST da 404 → `INTERNAL_SERVER_ERROR`) | Es el comportamiento esperado; usar ids 1, 3 o 4 |
| `/graphql` responde 400 en Render | Con `NODE_ENV=production` Apollo desactiva explorador e introspección | `playground: true` e `introspection: true` en `GraphQLModule.forRoot` |

## 7. Despliegue

_Pendiente: se completa después del despliegue en Render._

## 8. Declaración de uso de IA

### Declaración de uso de IA
- Herramienta(s): Claude (claude.ai) y Claude Code en VS Code
- Nivel de uso: 2–3 (borrador / revisor)
- Qué se le pidió: guía paso a paso, verificación de cada paso, explicación de errores (ESM, UnknownDependenciesException), despliegue en Render y redacción de la bitácora
- Qué se modificó/verificó manualmente: ejecución y prueba de cada query en el explorador /graphql, revisión del código, de los resultados y del despliegue
