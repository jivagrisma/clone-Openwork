# Seguimiento: Sistema de Archivos Adjuntos + Español Latino

**Fecha:** 11 de febrero de 2026
**Repositorio:** https://github.com/jivagrisma/clone-Openwork
**Fork de:** https://github.com/accomplish-ai/accomplish

---

## 📊 Resumen Ejecutivo

### Problema Principal
Los archivos adjuntos se crean como archivos temporales correctamente, pero **NO se incluyen en el prompt del agente** debido a una **incompatibilidad de tipos** entre `AdapterOptions` y `BuildCliArgsOptions`.

### Requerimiento Adicional
Forzar que todas las respuestas del agente sean en **español latino** para usuarios de América Latina.

---

## 🔍 Análisis Técnico (Anthropic-Sonnet MCP)

### Hallazgos Clave

1. **El sistema de archivos temporales YA está implementado** ✅
   - `TempFilesManager` funciona correctamente
   - Archivos se crean en `/tmp/waia-attachments/{sessionId}/`
   - Limpieza automática implementada

2. **El BUG está en la cadena de llamadas:**

   | Archivo | Línea | Firma | Problema |
   |---------|---------|-------|----------|
   | `adapter.ts` (agent-core) | 30 | `(config: TaskConfig, tempFiles?: TempFileInfo[]) => Promise<string[]>` | ❌ NO coincide con BuildCliArgsOptions |
   | `electron-options.ts` (desktop) | 153 | Usa wrapper correcto: `coreBuildCliArgs({...})` | ✅ Patrón correcto |
   | `config-generator.ts` | 655 | `(options: BuildCliArgsOptions): string[]` | ✅ Espera objeto |

3. **Solución Estructural Definitiva:**
   - Modificar `adapter.ts` (agent-core) para usar el mismo patrón que `electron-options.ts`
   - Actualizar `AdapterOptions` para incluir la firma correcta de `buildCliArgs`

---

## 📋 Plan de Acción

### FASE 1: Corrección del Bug de Tipos

| ID | Archivo | Cambio | Estado |
|-----|---------|--------|--------|
| F1.1 | `packages/agent-core/src/opencode/adapter.ts` | Actualizar interfaz `AdapterOptions` - cambiar firma de `buildCliArgs` | ⏳ Pending |
| F1.2 | `packages/agent-core/src/opencode/adapter.ts` | Modificar llamada a `buildCliArgs` en línea 201 y 705 | ⏳ Pending |

### FASE 2: Español Latino

| ID | Archivo | Cambio | Estado |
|-----|---------|--------|--------|
| F2.1 | `packages/agent-core/src/opencode/config-generator.ts` | Agregar instrucción de idioma en system prompt | ⏳ Pending |

### FASE 3: Validación

| ID | Descripción | Estado |
|-----|-------------|--------|
| F3.1 | Test: Adjuntar archivo y solicitar lectura | ⏳ Pending |
| F3.2 | Verificar logs de buildCliArgs | ⏳ Pending |
| F3.3 | Commit y push a GitHub | ⏳ Pending |

---

## 🎯 Detalle de Cambios

### Cambio F1.1 - AdapterOptions

```typescript
// ANTES (línea 29)
export interface AdapterOptions {
  // ...
  buildCliArgs: (config: TaskConfig, tempFiles?: TempFileInfo[]) => Promise<string[]>;
  // ...
}

// DESPUÉS
export interface AdapterOptions {
  // ...
  buildCliArgs: (options: {
    prompt: string;
    sessionId?: string;
    selectedModel?: { provider: string; model: string } | null;
    attachments?: TaskAttachment[];
    tempFiles?: TempFileInfo[];
  }) => Promise<string[]>;
  // ...
}
```

### Cambio F1.2 - Llamada a buildCliArgs

```typescript
// ANTES (línea 201)
const cliArgs = await this.options.buildCliArgs(config, this.tempFileInfos);

// DESPUÉS
const cliArgs = await this.options.buildCliArgs({
  prompt: config.prompt,
  sessionId: config.sessionId,
  selectedModel: this.currentModelId ? { provider: 'anthropic', model: this.currentModelId } : null,
  attachments: config.attachments,
  tempFiles: this.tempFileInfos,
});
```

### Cambio F2.1 - Español Latino

```typescript
// En ACCOMPLISH_SYSTEM_PROMPT_TEMPLATE (línea 116-280)
// Agregar después de <behavior name="user-communication">:

<language>
**CRITICAL: Always respond in Spanish (Latin American).**
- ALL responses must be in Spanish (Latinoamérica variant)
- Use "tú" or "usted" consistently (prefer "tú" for friendliness)
- Technical terms may remain in English (API, HTTP, JSON, etc.)
- Code comments should be in Spanish unless the user's code is in English
</language>
```

---

## 📝 Notas de Implementación

1. **Solo 2 archivos a modificar** (adapter.ts x2 cambios)
2. **Sin breaking changes** - es una corrección de tipos
3. **El patrón YA existe** en electron-options.ts como referencia
4. **Logs de debug existentes** ayudarán a verificar el fix

---

## ✅ Checklist de Finalización

- [ ] F1.1: AdapterOptions actualizada
- [ ] F1.2: buildCliArgs llamado correctamente
- [ ] F2.1: System prompt con español latino
- [ ] F3.1: Test manual exitoso
- [ ] F3.2: Logs verificados
- [ ] F3.3: Push a GitHub

---

## 🚀 Cambios Implementados

- [x] F1.1: AdapterOptions actualizada (adapter.ts)
- [x] F1.2: buildCliArgs llamado correctamente (startTask - línea 201)
- [x] F1.3: buildCliArgs llamado correctamente (spawnSessionResumption - línea 705)
- [x] F1.4: TaskAdapterOptions actualizada (types/task-manager.ts)
- [x] F1.5: TaskManagerOptions actualizada (internal/classes/TaskManager.ts)
- [x] F1.6: TaskManager wrapper actualizado (internal/classes/TaskManager.ts - línea 133)
- [x] F1.7: electron-options.ts actualizado (desktop - firma y parámetros)
- [x] F2.1: System prompt con instrucción de idioma español latino (config-generator.ts)

**Estado:** 🟢 Implementación Completada - Listo para Git commit
