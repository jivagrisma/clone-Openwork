# Plan de Implementación: Sistema de Archivos Adjuntos para WaIA

**Fecha:** 10 de febrero de 2026
**Repositorio:** https://github.com/jivagrisma/clone-Openwork
**Estado:** CONFIRMADO - Listo para ejecución

---

## 📋 Resumen Ejecutivo

### Problema
Los archivos adjuntos se convierten a base64 y solo se añaden como contexto en el prompt, pero **NO están físicamente disponibles** para que el agente OpenCode los lea con herramientas como `glob`, `read`, etc.

### Solución
Crear un sistema de archivos temporales que estén accesibles durante la ejecución de la tarea y se limpien automáticamente.

---

## 🔍 Análisis del Problema

### Flujo Actual (ROTO)
```
Usuario adjunta archivo → IPC handler → TaskAttachment (base64)
    ↓
buildCliArgs() → genera contexto de attachments en el prompt
    ↓
OpenCode CLI recibe prompt con info del archivo
    ↓
Agente intenta usar glob → NO ENCUENTRA NADA ❌
```

### Archivos Clave Analizados
| Archivo | Rol | Problema |
|---------|-----|----------|
| `packages/agent-core/src/opencode/config-generator.ts` | Genera contexto de attachments | Solo añade info al prompt, no rutas físicas |
| `packages/agent-core/src/opencode/adapter.ts` | Ejecuta OpenCode CLI | No crea archivos temporales |
| `apps/desktop/src/main/ipc/handlers-files.ts` | Procesa archivos adjuntos | Convierte a base64, no guarda temp |
| `packages/agent-core/src/common/types/task.ts` | Tipos TaskAttachment | Tiene campo `data` pero no `tempPath` |

---

## ✅ Especificación de Requerimientos (Kiro - Phase 1)

### Requerimientos Funcionales
| ID | Requerimiento | Prioridad |
|----|---------------|-----------|
| R1 | El sistema debe guardar archivos adjuntos temporalmente en disco | CRÍTICA |
| R2 | El agente debe poder acceder a los archivos con herramientas estándar (read, glob) | CRÍTICA |
| R3 | Los archivos deben limpiarse automáticamente después de la tarea | CRÍTICA |
| R4 | Debe ser compatible con el sistema existente sin breaking changes | ALTA |
| R5 | Debe soportar todos los tipos de archivo actuales (text, image, pdf, etc.) | ALTA |
| R6 | Debe manejar errores gracefully si no se pueden crear archivos temporales | MEDIA |

### Requerimientos No Funcionales
| ID | Requerimiento | Especificación |
|----|---------------|----------------|
| N1 | Performance | La creación de archivos no debe bloquear el inicio de la tarea (>100ms) |
| N2 | Seguridad | Los archivos temporales deben estar en directorio aislado del sistema |
| N3 | Compatibilidad | Debe funcionar en Windows, macOS y Linux |
| N4 | Limpieza | Los archivos deben eliminarse incluso si la aplicación crash |

---

## 🏗️ Diseño de la Solución (Kiro - Phase 2)

### Arquitectura Propuesta

```
┌─────────────────────────────────────────────────────────────────┐
│                        UI Layer                                 │
│  TaskInputBar → PlusMenu → AttachmentsList                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      IPC Handlers                                │
│  handlers-files.ts: processFile() → TaskAttachment (base64)     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   TempFilesManager (NUEVO)                       │
│  - createSessionFiles(sessionId, attachments)                   │
│  - getSessionFiles(sessionId)                                   │
│  - cleanupSession(sessionId)                                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  OpenCodeAdapter                                 │
│  - startTask() → crea archivos temporales                        │
│  - dispose() → limpia archivos temporales                       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              OpenCode CLI + Archivos Temporales                  │
│  Archivos en: /tmp/waia-attachments/{sessionId}/                 │
└─────────────────────────────────────────────────────────────────┘
```

### Componentes a Crear/Modificar

#### 1. TempFilesManager (NUEVO)
**Archivo:** `packages/agent-core/src/temp/temp-files-manager.ts`

```typescript
export class TempFilesManager {
  private static instance: TempFilesManager;
  private tempDir: string;
  private activeSessions: Map<string, TempFileInfo[]>;

  async createSessionFiles(sessionId: string, attachments: TaskAttachment[]): Promise<TempFileInfo[]>
  getSessionFiles(sessionId: string): TempFileInfo[]
  async cleanupSession(sessionId: string): Promise<void>
  async cleanupAll(): Promise<void>
}
```

#### 2. config-generator.ts (MODIFICAR)
**Cambios:**
- Actualizar `generateAttachmentsContext()` para incluir rutas físicas
- Añadir parámetro `tempFiles` opcional

#### 3. adapter.ts (MODIFICAR)
**Cambios:**
- Añadir propiedad `tempFileInfos` a la clase
- Crear archivos temporales en `startTask()`
- Limpiar archivos en `dispose()`

#### 4. index.ts (MODIFICAR)
**Cambios:**
- Exportar TempFilesManager

---

## 📝 Plan de Tareas (Kiro - Phase 3)

### Fase 1: Creación de TempFilesManager
| Tarea | Archivo | Descripción |
|-------|---------|-------------|
| T1.1 | `packages/agent-core/src/temp/temp-files-manager.ts` | Crear clase TempFilesManager |
| T1.2 | `packages/agent-core/src/temp/index.ts` | Exportar TempFilesManager |
| T1.3 | `packages/agent-core/src/index.ts` | Exportar desde package principal |

### Fase 2: Integración en config-generator
| Tarea | Archivo | Descripción |
|-------|---------|-------------|
| T2.1 | `packages/agent-core/src/opencode/config-generator.ts` | Actualizar generateAttachmentsContext con rutas |
| T2.2 | `packages/agent-core/src/opencode/config-generator.ts` | Actualizar BuildCliArgsOptions interface |
| T2.3 | `packages/agent-core/src/opencode/config-generator.ts` | Actualizar buildCliArgs para pasar tempFiles |

### Fase 3: Integración en OpenCodeAdapter
| Tarea | Archivo | Descripción |
|-------|---------|-------------|
| T3.1 | `packages/agent-core/src/opencode/adapter.ts` | Añadir propiedades tempFileInfos y tempDir |
| T3.2 | `packages/agent-core/src/opencode/adapter.ts` | Crear archivos en startTask() |
| T3.3 | `packages/agent-core/src/opencode/adapter.ts` | Pasar tempFiles a buildCliArgs |
| T3.4 | `packages/agent-core/src/opencode/adapter.ts` | Limpiar archivos en dispose() |

### Fase 4: Integración en TaskManager
| Tarea | Archivo | Descripción |
|-------|---------|-------------|
| T4.1 | `packages/agent-core/src/internal/classes/TaskManager.ts` | Actualizar buildCliArgs wrapper |

### Fase 5: Tests
| Tarea | Archivo | Descripción |
|-------|---------|-------------|
| T5.1 | `packages/agent-core/src/temp/temp-files-manager.test.ts` | Tests unitarios TempFilesManager |
| T5.2 | `packages/agent-core/src/opencode/config-generator.test.ts` | Tests con archivos temporales |
| T5.3 | `apps/desktop/e2e/specs/file-attachments.spec.ts` | Test E2E de archivos adjuntos |

### Fase 6: Git y Publicación
| Tarea | Descripción |
|-------|-------------|
| T6.1 | Commit de cambios |
| T6.2 | Push a GitHub |

---

## 🧪 Plan de Tests

### Tests Unitarios
```typescript
// temp-files-manager.test.ts
describe('TempFilesManager', () => {
  it('should create session files from attachments')
  it('should return temp file info for session')
  it('should cleanup session files')
  it('should handle multiple sessions')
  it('should cleanup all sessions')
})
```

### Tests de Integración
```typescript
// config-generator.test.ts
describe('buildCliArgs with attachments', () => {
  it('should include temp paths in context')
  it('should handle empty attachments')
  it('should handle large files')
})
```

### Tests E2E
```typescript
// file-attachments.spec.ts
test('should read attached file with glob tool', async ({ page }) => {
  // 1. Adjuntar archivo
  // 2. Enviar tarea solicitando leer archivo
  // 3. Verificar que el agente encuentra y lee el archivo
})
```

---

## 📊 Criterios de Aceptación

| ID | Criterio | Verificación |
|----|----------|-------------|
| AC1 | Los archivos se guardan en /tmp/waia-attachments/{sessionId}/ | Test unitario |
| AC2 | El prompt incluye las rutas de los archivos | Test de integración |
| AC3 | El agente puede leer archivos con glob/read | Test E2E |
| AC4 | Los archivos se eliminan después de la tarea | Test unitario + E2E |
| AC5 | Funciona en Windows, macOS, Linux | Test manual en cada OS |
| AC6 | No romve funcionalidad existente | Test suite completo |

---

## 🚀 Plan de Ejecución

### Orden de Ejecución
1. **Setup:** Crear team de Claude Code
2. **Context:** Obtener contexto completo del código
3. **Implementación Fase 1:** TempFilesManager
4. **Implementación Fase 2:** config-generator
5. **Implementación Fase 3:** OpenCodeAdapter
6. **Implementación Fase 4:** TaskManager
7. **Tests:** Unitarios + Integración + E2E
8. **Quality:** code-simplifier + react-best-practices
9. **Git:** Commit y push a GitHub

### Tiempos Estimados
| Fase | Tiempo |
|------|--------|
| Fase 1: TempFilesManager | 30 min |
| Fase 2: config-generator | 20 min |
| Fase 3: OpenCodeAdapter | 40 min |
| Fase 4: TaskManager | 10 min |
| Fase 5: Tests | 30 min |
| Fase 6: Git | 10 min |
| **Total** | **~2.5 horas** |

---

## 📁 Archivos a Crear/Modificar

### Nuevos Archivos (2)
```
packages/agent-core/src/temp/temp-files-manager.ts
packages/agent-core/src/temp/index.ts
packages/agent-core/src/temp/temp-files-manager.test.ts
```

### Archivos a Modificar (4)
```
packages/agent-core/src/opencode/config-generator.ts
packages/agent-core/src/opencode/adapter.ts
packages/agent-core/src/index.ts
packages/agent-core/src/internal/classes/TaskManager.ts
```

### Tests a Crear/Modificar (3)
```
packages/agent-core/src/temp/temp-files-manager.test.ts
packages/agent-core/src/opencode/config-generator.test.ts
apps/desktop/e2e/specs/file-attachments.spec.ts
```

---

## ✅ Checklist de Implementación

### Antes de Empezar
- [x] Plan creado y aprobado
- [ ] Team de Claude Code creado
- [ ] Contexto del código obtenido

### Durante Implementación
- [ ] Fase 1: TempFilesManager creada
- [ ] Fase 2: config-generator actualizado
- [ ] Fase 3: OpenCodeAdapter actualizado
- [ ] Fase 4: TaskManager actualizado
- [ ] Fase 5: Tests creados y pasando
- [ ] Fase 6: Quality checks pasados

### Después de Implementación
- [ ] Todos los tests pasan
- [ ] Type check exitoso
- [ ] Lint exitoso
- [ ] E2E tests pasan
- [ ] Cambes commiteados
- [ ] Cambes push a GitHub

---

## 🔗 Referencias

- Repositorio: https://github.com/jivagrisma/clone-Openwork
- Documentación Kiro: `/kiro-full-rules`
- Anthropic-Sonnet MCP: Para razonamiento complejo
- code-simplifier: Para refinar código
- react-best-practices: Para validar UI components

---

**Estado:** ✅ CONFIRMADO - Proceder con implementación
**Fecha de confirmación:** 10 de febrero de 2026
