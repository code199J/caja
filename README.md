# Caja · dónde poner la plata

App personal de finanzas para Venezuela. Registras lo que te cayó (en Bs o USD)
y la app consulta las tasas del momento —BCV, paralelo y USDT P2P— antes de
recomendarte cómo repartirlo: cuánto dejar en el banco, cuánto pasar a USDT y
cuánto guardar en efectivo.

## Cómo funciona

1. **Repartir**: escribes el monto y la moneda, tocas *Repartir este dinero* y
   la app refresca las tasas en vivo (dolarapi.com + criptoya.com) y calcula:
   - primero cubre los **gastos fijos** que falten del mes,
   - el excedente se reparte entre **colchón de emergencia**, **metas** y
     **caja libre** según el tamaño del ingreso frente a tus gastos,
   - el veredicto dice si conviene **comprar USDT ya** (compara el precio P2P
     contra el paralelo y la devaluación mensual del BCV) o dejar bolívares,
   - cada destino trae el *por qué* y los pasos para ejecutarlo.
2. **Metas**: proyectos con monto, fecha y prioridad. Al registrar un ingreso,
   el avance de las metas sube solo.
3. **Historial**: cada ingreso con su reparto y las tasas de ese momento.
   Borrar un movimiento devuelve lo abonado.
4. **Ajustes**: gastos fijos, meses de colchón, perfil (liquidez / equilibrio /
   dolarizar) y umbral para dividir la custodia entre Binance y efectivo.

Los datos viven en el teléfono (localStorage). Nada sale de ahí; el respaldo
se descarga como JSON desde Ajustes.

## Tasas

| Dato | Fuente | Uso |
| --- | --- | --- |
| BCV oficial + histórico | `ve.dolarapi.com/v1/...` | contabilidad y ritmo de devaluación (últimos 30 días) |
| Paralelo | `ve.dolarapi.com/v1/dolares/paralelo` | valor real de los Bs |
| USDT P2P (Binance y 6 exchanges más) | `criptoya.com/api/USDT/VES/1` | precio de compra/venta de USDT |

Se cachean 10 minutos y se refrescan al abrir la app, al volver a ella y al
repartir. Sin conexión usa las últimas guardadas y te avisa.

## Uso

```bash
npm install     # solo la primera vez
npm run dev     # desarrollo en http://localhost:5188
npm run build   # genera dist/
./servir.sh     # sirve dist/ en la red local para abrirlo desde el teléfono
```

`servir.sh` imprime la dirección para abrir desde el celular (misma red WiFi),
por ejemplo `http://192.168.0.151:8080`. Mientras la ThinkPad esté encendida,
el teléfono puede usar la app desde el navegador.

### Instalarla como app de verdad (PWA)

El navegador solo permite "instalar" apps servidas por HTTPS. Para eso:

1. Crea un repositorio en tu GitHub (público) y sube la carpeta `dist/`
   (o todo el proyecto y activa *Deploy from a branch* apuntando a `dist`).
2. En Settings → Pages, publica la rama.
3. Abre la URL de Pages en el teléfono → *Agregar a pantalla de inicio*.

La app queda instalada, funciona sin la PC encendida y las tasas se consultan
directo desde el teléfono (no hay servidor propio: las APIs son públicas).

## Estructura

```
src/
  engine/
    rates.ts      # consulta y cacheo de tasas (CORS-safe, sin preflight)
    allocate.ts   # motor de reparto en cascada + veredicto de tasas
  lib/
    store.ts      # persistencia en localStorage
    format.ts     # formato es-VE de montos, tasas y fechas
  components/     # RateRail, AmountPanel, PlanView, Goals, History, Settings
  styles.css      # identidad visual: papel frío, tinta verde-negra, sello guayaba
public/
  sw.js           # service worker (offline tras primera visita en HTTPS)
  manifest.webmanifest
```
