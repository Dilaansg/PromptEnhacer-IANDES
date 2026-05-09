# **IANDES V6**

## **Contexto del sistema:**

Actualmente, IAndes V5 funciona como una extensión que recibe un prompt a través del DOM en la web de sitios de IA (chatgpt.com, claude.ai, gemini.google.com). Cuando el prompt se "optimiza" (que realmente se comprime), muestra en la UI del usuario en la página (mediante un *Shadow DOM* ) el cambio que se hizo y qué palabras se quitaron. Además, mide métricas de tokens, agua y CO2 con estimaciones con base en literatura académica. **El contexto detallado del sistema está en* `./README.md`*

## **El problema:**

IAndes V5.0 tiene bastantes limitaciones que se han ido encontrando en *debug* y que deben ser solucionadas para que el proyecto sea presentado como un MVP.

**Limitaciones**

* **Fricción con el usuario final:** El hecho de usar un servidor local añade fricción, ya que el usuario final tiene que descargar la extensión y un programa aparte para el servidor local. Además, debe tener conocimiento técnico para poder ejecutarlo y que funcione, creando bastante fricción y barreras de entrada para el usuario final.
* **Casos y soluciones (El fracaso de la tijera):** El hecho de comprimir palabras específicas nos deja con la limitación de casos en los que el usuario escriba mal una palabra, ponga un signo, o en general haga algo que el sistema no tiene contemplado dentro de sus casos. Para todos los modelos deterministas este es el mayor limitante. El hecho de que el sistema no reconozca o reconozca mal casos, entrega prompts defectuosos (fragmentando la intención semántica) que, a la larga, terminan empeorando el resultado.
* **Basado en literatura científica:** Según *papers* publicados entre 2020 y 2025, existen muchas formas de optimizar los prompts; esta que se usa (recorte) es una de ellas, pero el problema choca con el enfoque principal del proyecto.
  * **3.1. Sostenibilidad:** El proyecto tiene un tema central desde el cual fue planteado y es la **SOSTENIBILIDAD**. Según la literatura, la fase de inferencia de los LLMs consume recursos energéticos en masa (hasta el 90% del ciclo de vida de un modelo), lo que deriva en consumo de:
    * **Agua:** Se consume tanto para el enfriamiento local de los servidores donde se alojan los modelos (WUE local), como en las centrales eléctricas que proveen de energía a dichos servidores (WUE remoto/fuente)**.**
    * **CO2:** La huella de carbono de los LLMs proviene de las cantidades masivas de energía que requieren al día para funcionar, calculadas según el Factor de Intensidad de Carbono (CIF) de la red.
  * **3.2. Cómo funcionan los LLM:** Los LLM funcionan con TOKENS. Hay tokens de entrada (que se calculan dependiendo del prompt del usuario) y de salida (generados con la inferencia y respuesta del LLM). Los tokens se usan para medir el uso del LLM y de aquí se pueden hacer aproximaciones del gasto energético, agua y CO2.
  * **Aquí se forma el problema central: la solución propuesta de cortar palabras, cual tijera con papel, superficialmente puede parecer una solución. Los tokens de entrada se ven reducidos y podría creerse que al LLM le costará menos procesar una menor cantidad de palabras**.
  * Sin embargo, estudios realizados demuestran que el momento en el que se incurre en el mayor costo computacional es en el proceso de inferencia. Básicamente, si lo que ingresa el usuario es muy vago y carece de contexto o aspectos específicos, la IA gastará más recursos reconociendo "qué quiso decir" el usuario, activando rutinas de "sobre-razonamiento" para generar una respuesta.
  * Con base en esto, podemos decir que ingresar una menor cantidad de palabras no es directamente proporcional al costo computacional de los servidores; tiene restricciones y puede llegar a ser paradójico (el paradigma del *Green Prompting* **)**.
* **Manejo del usuario con el contexto y salida:** Actualmente el sistema actúa solo. El usuario le dice "sí, comprimir", pero no sabe qué puede llegar a quitar el sistema que realmente necesitaba. Aunque se cubre dejando un panel de antes/después, no funciona y no cubre casos en los que el usuario no sabe con exactitud qué dejar y qué quitar. Esto implica desgaste cognitivo en una herramienta que supuestamente debería estar planteada para ahorrar uso cognitivo.
* **Modelo de negocio:** Quizás la parte más importante a nivel de producto. Un usuario no va a descargar, y menos va a pagar, por un producto que no le otorgue un beneficio claro. La sostenibilidad es un tema que mucha gente ignora en la actualidad; entre varios factores, los usuarios no quieren tener que sacrificar la calidad de sus respuestas para mejorar un problema intangible.

## **La solución:**

IAndes V6 buscará solucionar los problemas y limitaciones encontrados en IAndes V5. Esta versión cambia la visión de *cómo* se hace, no de *qué* se hace.

¿Qué busca IAndes? Fomentar la sostenibilidad a través de una OPTIMIZACIÓN de los prompts del usuario en los LLMs a través de sus chatbots, que es donde más se usan.Se pasará de un modelo en el que su forma de optimizar era actuando como una tijera (recortando palabras u oraciones inútiles dentro del prompt), a un asistente de prompts que, a través de la semántica y el paradigma  *Human-in-the-Loop* **, creará un prompt estructurado y funcional sustentado en la literatura académica de este ámbito**.

#### **Por qué soluciona las limitaciones:**

* Fricción con el usuario local: V6 propone usar todo dentro del navegador. No se usarán SLMs pesados locales en el flu	jo; por ende, la fricción con el usuario se ve reducida a simplemente buscar la extensión e instalarla.
* Casos y soluciones: El sistema aún tendrá casos edge, pero esto no cambiará la respuesta ni creará problemas para el usuario si se aplica correctamente la estructuración estandarizada del flujo del prompt.
* Basado en literatura científica: Superficialmente pareciera que mejorar el prompt (lo que implica aumentar su tamaño) gastará más recursos, pero la literatura refuta esta visión simplista.
  * O(n^2): La arquitectura Transformer escala cuadráticamente. En una iteración se procesará el doble de tokens, pero costará cuatro veces más energía. Si no se logra la respuesta correcta y el usuario debe iterar (regenerar), habrá muchísimo más gasto computacional**.
  * La solución a esto es buscar, como se conoce en el ámbito, un "One-Shot" (o Zero-Shot): lograr que el LLM dé una respuesta perfecta con el primer prompt estructurado. Esto reduce exponencialmente el costo computacional en comparación con regenerar múltiples prompts vagos.
  * Reducción en el proceso de inferencia: Si se indica qué hacer, el contexto, cómo hacerlo y qué formato devolver usando verbos de acción directos, el LLM pasa de divagar buscando una respuesta, a seguir instrucciones específicas, lo cual recorta severamente la latencia y el consumo eléctrico de inferencia.
* Manejo del contexto y salida: Aquí se usará *Human-in-the-Loop* (asistencia visual). Para entender mejor el contexto, se le harán preguntas rápidas al usuario mediante la interfaz para obtener clasificaciones que mejoren el contexto, y así no dejar vagos aspectos importantes de la ingeniería de prompts como el público, el tono, etc...
* Además, la salida es algo predefinido. No se devolverá un texto "dañado" o fragmentado que obligue al usuario a cambiar o volver a hacer. Si el usuario no queda a gusto, ya tiene una base estructurada desde donde construir, siguiendo la visión de educar en ingeniería de prompts.
* Modelo de negocio: Esto sí funciona como modelo, puesto que esta vez se le está otorgando un beneficio real al usuario. Darle una herramienta con la cual pueda mejorar la precisión de los LLMs de inmediato y que, con el uso, le enseñe ingeniería de prompts, es algo que el usuario final sí usaría. Gran parte del estado del arte usa APIs externas para esto, pero eso aumenta el costo y compromete la privacidad de los datos (ej. Promptly). Contrariamente, Ecoprompt tenía la visión de sostenibilidad pero se quedó en prototipos sin uso real. V6 combina el ahorro ecológico con un aumento de calidad tangible 100% privado en el navegador.

#### Casos a tener en cuenta en V6:

* El problema del sobre-razonamiento: No se deben incluir técnicas complejas como *Chain-of-Thought* ("piensa paso a paso") para tareas sencillas que el modelo puede responder directamente (Zero-Shot). Inducir razonamientos artificiales en tareas simples incrementa el tiempo de cómputo, genera tokens superfluos y empeora la precisión.
* Control de la densidad de salida: En tu estructuración, asegúrate de que IAndes V6 inyecte comandos con verbos directos ("resume", "lista", "clasifica") en lugar de verbos expansivos ("analiza en profundidad", "justifica") cuando no sea estrictamente necesario**. Restringir la verbosidad de salida del LLM puede recortar la energía incurrida hasta en un 60% por operación.
