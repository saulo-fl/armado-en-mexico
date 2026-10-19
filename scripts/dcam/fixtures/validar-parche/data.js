// Copia CONGELADA de un recorte de src/data/data.js (16-oct-2026) para validar-parche.test.mjs.
// Los tests no leen src/data/ en vivo: una edición normal de los datos no debe romper npm test.
// ──────────────────────────────────────────────────────────────
// CATÁLOGO ARMADO EN MÉXICO — 2025
// Basado en existencias DCAM-SEDENA al 3 de octubre de 2025
// ──────────────────────────────────────────────────────────────
const W = "https://commons.wikimedia.org/wiki/Special:FilePath/";

window.DB = [

  // ═══════════════════════════════════════════════════════════
  //  PISTOLAS .380 ACP — USO CIVIL (DCAM)
  // ═══════════════════════════════════════════════════════════
  mk(1, "Taurus TH380", "Taurus", "pistola", "Brasil", ".380 ACP", "15+1", "725g", "188mm", "Semi-auto, DA/SA", 2019, "dcam", "PISTOLA CAL .380 TAURUS TH380 PAVON", "imagenes/001_Taurus_TH380.webp?v=2", "Pistola compacta de servicio fabricada en Brasil. Calibre .380 ACP de libre adquisición para civiles. Excelente relación costo-beneficio y una de las más populares para defensa de domicilio."),

  // ═══════════════════════════════════════════════════════════
  //  IWI ARAD 7 DMR — variante de TIRADOR DESIGNADO (OTCA)
  //  Modelo aparte del ARAD 7 estándar (id 79): build de precisión.
  // ═══════════════════════════════════════════════════════════
  mk(128, "IWI ARAD 7 DMR", "IWI", "carabina", "Israel", "7.62x51mm", "20+1", "≈4.0 kg", "≈1000 mm", "Semiauto de precisión (DMR), gatillo de dos etapas", 2023, "ejercito", "FUSIL DE ASALTO CALIBRE 7.62 X 51 mm MARCA I.W.I. MODELO ARAD 7 DMR, SEMIAUTOMÁTICO", "imagenes/IWI_ARAD_7_DMR.webp", "Variante DMR (Designated Marksman Rifle) del ARAD 7: el mismo chasis modular tipo AR-10 en 7.62×51 mm OTAN, pero re-configurado para el rol de TIRADOR DESIGNADO de media-larga distancia. Frente al ARAD 7 estándar (fusil de asalto select-fire de uso general, id 79), el DMR es exclusivamente SEMIAUTOMÁTICO y prioriza la precisión: cañón más largo de paso de estría más rápido (≈1:254 mm / 1:10\" vs ≈1:304 mm / 1:12\" del fusil de asalto) optimizado para proyectiles pesados, cañón flotante (free-float) que no toca el guardamanos, gatillo de DOS ETAPAS para un disparo limpio y repetible, y riel superior continuo pensado para montar óptica de aumento. Esa combinación de cañón de precisión, gatillo de competencia y la mira telescópica que casi siempre lo acompaña explica el salto de precio: ≈\$111,016 MXN, más del doble del ARAD 7 estándar (≈\$47,132 MXN). En síntesis: el ARAD 7 es el fusil de combate versátil; el ARAD 7 DMR es la herramienta de tiro de precisión derivada de él."),
];

window.armaPlaceholder = function (arma) {
  const TIPOS = ['pistola', 'revolver', 'rifle', 'escopeta', 'carabina'];
  const t = arma && TIPOS.indexOf(arma.tipo) >= 0 ? arma.tipo : 'pistola';
  return 'imagenes/silueta-' + t + '.webp';
};

// si un arma no tiene imagen, asigna su placeholder al cargar
window.DB.forEach(a => { if (!a.img) a.img = window.armaPlaceholder(a); });
