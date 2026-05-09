# 20 Prompts para Demostración — IAndes v6

> Prompts probados que muestran el valor del pipeline de forma clara y funcional.

---

## Información / Explicación

### 1. Definición técnica
```
qué es la inteligencia artificial
```
**Resultado esperado:** Tipo `informacion`, intent `definicion`, dominio `tecnologia`, persona "arquitecto de software". Pregunta nivel y formato. SuperPrompt con definición estructurada.

### 2. Explicación histórica (adaptación por dominio)
```
Explicame la segunda guerra mundial
```
**Resultado esperado:** Dominio `historia`, persona "historiador experto". La instrucción se adapta automáticamente: "con rigor histórico y contextual" en vez de "con rigor técnico".

### 3. Comparación científica
```
compara la mitosis y la meiosis
```
**Resultado esperado:** Dominio `biologia`, intent `comparacion`. SuperPrompt con criterios de comparación explícitos y tabla.

---

## Generación de Contenido

### 4. Ensayo (lexical override: "haz" → generacion)
```
haz un ensayo sobre el cambio climático
```
**Resultado esperado:** El modelo intenta clasificar como `conversacion` pero el lexical override lo corrige a `generacion/texto_creativo`. Persona: "escritor y divulgador". Pregunta nivel.

### 5. Contenido creativo
```
escribe un cuento corto sobre un robot que aprende a sentir
```
**Resultado esperado:** Tipo `generacion`, intent `texto_creativo`, dominio `literatura`. Persona: "escritor y crítico literario".

### 6. Contenido profesional
```
redacta un informe ejecutivo sobre los resultados del Q3
```
**Resultado esperado:** Tipo `generacion`, intent `contenido_profesional`, dominio `negocios`. Formato profesional.

---

## Código

### 7. Escribir código
```
escribe una función en Python que ordene una lista de diccionarios por fecha
```
**Resultado esperado:** Tipo `codigo`, intent `escribir_codigo`. Pregunta nivel (solo código vs código comentado vs explicación paso a paso).

### 8. Debug
```
tengo un error de typescript en mi api dice "cannot read property of undefined" cómo lo arreglo
```
**Resultado esperado:** Tipo `codigo`, intent `debug`. SuperPrompt con estructura de debugging sistemático.

---

## Análisis

### 9. Pros y contras
```
ventajas y desventajas de la energía nuclear frente a la solar
```
**Resultado esperado:** Tipo `analisis`, intent `pros_contras`, dominio `medio_ambiente`. SuperPrompt con criterios explícitos de comparación.

### 10. Análisis de texto
```
analiza este texto y dame feedback sobre su estructura y argumentación
```
**Resultado esperado:** Tipo `analisis`, intent `feedback`. Detecta que es análisis de contenido externo (paste detection).

---

## Transformación

### 11. Resumen
```
resume este artículo sobre machine learning en 3 puntos clave
```
**Resultado esperado:** Tipo `transformacion`, intent `resumen`. Detecta contenido externo. Pregunta formato.

### 12. Traducción
```
traduce este texto al inglés manteniendo el tono formal
```
**Resultado esperado:** Tipo `transformacion`, intent `traduccion`. Atributos: tono formal detectado.

---

## Acción / Tutoriales

### 13. Tutorial paso a paso
```
guía paso a paso para configurar un servidor nginx con SSL
```
**Resultado esperado:** Tipo `accion`, intent `tutorial`, dominio `tecnologia`. Formato paso_a_paso por defecto.

### 14. Plan de acción
```
necesito un plan de acción para lanzar mi startup en 3 meses
```
**Resultado esperado:** Tipo `accion`, intent `plan`, dominio `negocios`. SuperPrompt con estructura de planificación.

---

## Conversación

### 15. Roleplay
```
actúa como un entrevistador técnico y hazme preguntas de system design
```
**Resultado esperado:** Tipo `conversacion`, intent `roleplay`. Pregunta tono y formato.

### 16. Debate
```
organicemos un debate sobre la inteligencia artificial y la ética
```
**Resultado esperado:** Tipo `conversacion`, intent `debate`. SuperPrompt con estructura de debate.

---

## Razonamiento

### 17. Resolver problema
```
si tengo 3 cajas y cada caja tiene 5 bolsas con 8 canicas cada una cuántas canicas tengo en total
```
**Resultado esperado:** Tipo `razonamiento`, intent `resolver_problema`. SuperPrompt con estructura de razonamiento paso a paso.

### 18. Causa raíz
```
por qué mi aplicación es lenta si solo tiene 100 usuarios activos
```
**Resultado esperado:** Tipo `razonamiento`, intent `causa_raiz`. Dominio `tecnologia`.

---

## Multi-dominio

### 19. Filosofía
```
qué es el existencialismo y cuáles son sus principales exponentes
```
**Resultado esperado:** Tipo `informacion`, dominio `filosofia`. Instrucción adaptada a humanidades (sin jerga técnica).

### 20. Prompt vago (máximo preguntas)
```
ayúdame con algo de matemáticas
```
**Resultado esperado:** Complejidad baja → vagueness alta → 3-4 preguntas en Capa B. El sistema pide aclarar nivel, tema específico, formato.

---

## Orden sugerido para la demo

| # | Prompt | Qué demuestra |
|---|--------|---------------|
| 1 | `qué es la inteligencia artificial` | Flujo básico completo |
| 2 | `Explicame la segunda guerra mundial` | Adaptación por dominio (historia) |
| 3 | `haz un ensayo sobre el cambio climático` | Lexical override + persona type+domain |
| 4 | `escribe una función en Python que ordene una lista de diccionarios por fecha` | Clasificación de código |
| 5 | `compara la mitosis y la meiosis` | Comparación + dominio biología |
| 6 | `ventajas y desventajas de la energía nuclear frente a la solar` | Análisis + dominio medio_ambiente |
| 7 | `traduce este texto al inglés manteniendo el tono formal` | Transformación + atributos |
| 8 | `actúa como un entrevistador técnico y hazme preguntas de system design` | Conversación/roleplay |
| 9 | `guía paso a paso para configurar un servidor nginx con SSL` | Acción/tutorial |
| 10 | `ayúdame con algo de matemáticas` | Prompt vago → máx preguntas |
