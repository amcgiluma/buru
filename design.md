# Direccion Visual BURU Online

## Concepto

Pixelart minimalista de mesa nocturna: alto contraste, bordes duros, sombras de bloque y feedback tactil. La app debe sentirse arcade y precisa sin copiar assets ni identidad de ningun juego existente.

## Paleta

- Fondo: `#16181d` tinta.
- Mesa: `#0f5b57` verde azulado.
- Superficie: `#18383e` gris petroleo.
- Cartas: `#f4ead5` blanco hueso.
- Texto oscuro: `#16181d`.
- Rojo: `#b63f35`.
- Dorado turno: `#d6ad4f`.
- Amarillo senal: `#f6d95f`.
- Verde accion: `#79d695`.
- Azul informacion: `#58a8c9`.

Evitar que la UI sea monotona: los estados deben introducir rojo, dorado, verde y azul con intencion.

## Tipografia

Usar fuentes del sistema con tratamiento monoespaciado para titulos y numeros. Si se incorpora una fuente pixel open source en el futuro, documentar licencia y archivo exacto.

## Cartas

Las cartas del MVP se renderizan con CSS y texto, sin assets externos. El reverso BURU usa patron propio de diagonales y pequenos bloques. Estados:

- Normal: hueso con borde tinta.
- Jugable: borde verde y elevacion estable.
- Seleccionada: desplazamiento minimo sin cambiar dimensiones.
- Bloqueada: opacidad reducida.
- Ganadora: borde dorado y brillo corto.

## Estados De Juego

- Turno activo: aro dorado y pulso leve.
- Accion valida: boton verde.
- Error o vida perdida: rojo.
- Informacion: azul.
- Eliminado: baja saturacion y etiqueta compacta.

## Responsive

- Movil: mano abajo con scroll horizontal estable, mesa compacta y jugadores en carrusel radial simplificado.
- Desktop: jugadores alrededor de la mesa y mano centrada abajo.
- Botones tactiles de al menos 44px.
- Nombres largos truncados con ellipsis, nunca solapados.
- Las cartas mantienen `aspect-ratio: 5 / 7` y no cambian layout al interactuar.

## Assets Y Licencia

No hay assets externos en el MVP. Si se anaden:

- Webisso Playing Cards: MIT, apto para baraja francesa, incluir atribucion.
- Wikimedia Baraja espanola SVG: revisar CC BY-SA 3.0 antes de derivar.
- Alternativa recomendada para evitar complejidad: crear cartas espanolas propias con iconografia original.
