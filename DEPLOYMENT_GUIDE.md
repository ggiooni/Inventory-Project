# Smart Inventory - Deployment Guide

## Firebase Cloud Functions Deployment

### Security Architecture

```
┌─────────────────┐     ┌──────────────────────┐     ┌──────────────┐
│    BROWSER      │     │   FIREBASE CLOUD     │     │   GROQ API   │
│   (Frontend)    │────>│     FUNCTIONS        │────>│              │
│                 │     │                      │     │              │
│  No API Key     │     │  API Key stored      │     │  AI Process  │
│                 │<────│  in environment vars │<────│              │
└─────────────────┘     └──────────────────────┘     └──────────────┘
```

---

## Step 1: Login to Firebase

Open the terminal in the project folder and run:

```bash
cd "<PROJECT_FOLDER_PATH>"

firebase login
```

Esto abrira el navegador para autenticarte con tu cuenta de Google.

---

## Paso 2: Configurar la API Key de Groq (SEGURO)

Ejecuta este comando para guardar la API key de forma segura:

```bash
firebase functions:config:set groq.apikey="TU_API_KEY_DE_GROQ_AQUI"
```

**IMPORTANTE:** Este comando guarda la API key en los servidores de Firebase.
- NO se guarda en el codigo
- NO se expone al navegador
- Solo las Cloud Functions pueden acceder a ella

Para verificar que se guardo correctamente:

```bash
firebase functions:config:get
```

---

## Paso 3: Desplegar Cloud Functions

```bash
firebase deploy --only functions
```

Esto subira las funciones a Firebase. El proceso puede tardar unos minutos.

Al finalizar, veras URLs como:

```
Function URL (aiChat): https://us-central1-bar-inventory-15a15.cloudfunctions.net/aiChat
Function URL (getAIPredictions): https://us-central1-bar-inventory-15a15.cloudfunctions.net/getAIPredictions
Function URL (generateShoppingList): https://us-central1-bar-inventory-15a15.cloudfunctions.net/generateShoppingList
```

---

## Paso 4: Desplegar Frontend (Opcional)

Si quieres hospedar el frontend en Firebase Hosting:

```bash
firebase deploy --only hosting
```

Tu app estara disponible en:
- https://bar-inventory-15a15.web.app
- https://bar-inventory-15a15.firebaseapp.com

---

## Desarrollo Local (Emulador)

Para probar localmente sin desplegar:

### 1. Crear archivo de configuracion local

Crea un archivo `.runtimeconfig.json` en la carpeta `functions/`:

```json
{
  "groq": {
    "apikey": "TU_API_KEY_AQUI"
  }
}
```

**IMPORTANTE:** Este archivo esta en .gitignore y NO se sube al repositorio.

### 2. Iniciar emuladores

```bash
firebase emulators:start
```

Esto iniciara:
- Functions en: http://localhost:5001
- Hosting en: http://localhost:5000

---

## Comandos Utiles

| Comando | Descripcion |
|---------|-------------|
| `firebase login` | Iniciar sesion |
| `firebase logout` | Cerrar sesion |
| `firebase deploy` | Desplegar todo |
| `firebase deploy --only functions` | Solo funciones |
| `firebase deploy --only hosting` | Solo hosting |
| `firebase functions:log` | Ver logs de funciones |
| `firebase emulators:start` | Iniciar emuladores locales |

---

## Verificar Despliegue

Despues de desplegar, puedes probar la funcion con curl:

```bash
curl -X POST https://us-central1-bar-inventory-15a15.cloudfunctions.net/aiChat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, are you working?"}'
```

---

## Troubleshooting

### Error: "Groq API key not configured"
- Ejecuta: `firebase functions:config:set groq.apikey="TU_API_KEY"`
- Redespliega: `firebase deploy --only functions`

### Error: "CORS blocked"
- Las funciones ya tienen CORS configurado
- Verifica que estes usando la URL correcta

### Error: "Function not found"
- Asegurate de haber desplegado: `firebase deploy --only functions`
- Verifica los logs: `firebase functions:log`

---

## Seguridad Implementada

| Aspecto | Implementacion |
|---------|----------------|
| API Key | Almacenada en Firebase Config (servidor) |
| CORS | Configurado para permitir requests del frontend |
| Validacion | Verificacion de metodo HTTP y parametros |
| Rate Limiting | Firebase aplica limites automaticos |
| Logs | Errores registrados en Firebase Console |

---

## Costos

Firebase Cloud Functions tiene un plan gratuito generoso:
- 2 millones de invocaciones/mes gratis
- 400,000 GB-segundos/mes gratis
- Mas que suficiente para un proyecto universitario

---

**Proyecto:** BSc Computer Science - Final Year Project
**Autor:** Nicolas Boggioni Troncoso
**Universidad:** Dorset College Dublin
