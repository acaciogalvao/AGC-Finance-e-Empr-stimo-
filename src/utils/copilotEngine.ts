import { PlatformName } from '../context/FinanceContext';

export interface CopilotRideOffer {
  id: string;
  app: PlatformName;
  category: string; // 'UberX' | 'Uber Comfort' | 'Uber Black' | 'Uber Flash' | '99Pop' | '99Plus' | '99Negocia' | '99Moto' | 'InDrive' | 'Outro';
  grossValue: number; // R$
  dynamicValue?: number; // R$ adicional dinâmico
  pickupDistanceKm: number; // km até o passageiro
  pickupDurationMin: number; // min até o passageiro
  tripDistanceKm: number; // km da viagem
  tripDurationMin: number; // min da viagem
  totalDistanceKm: number; // km total (pickup + trip)
  totalDurationMin: number; // min total (pickup + trip)
  pickupAddress: string;
  dropoffAddress: string;
  passengerRating?: number; // ex: 4.92
  timestamp: string; // ISO
  rawText?: string;

  // Métricas calculadas
  valuePerKmTotal: number; // R$ / km total
  valuePerKmTrip: number; // R$ / km viagem
  valuePerMinute: number; // R$ / min
  valuePerHour: number; // R$ / hora
  estimatedFuelCost: number; // Custo estimado combustível
  estimatedMaintenanceCost: number; // Custo manutenção por km
  estimatedTotalCost: number; // Custo total do veículo
  estimatedNetProfit: number; // Lucro líquido em R$
  netPerHour: number; // Lucro líquido por hora em R$

  // Veredito & Recomendações
  verdict: 'EXCELENTE' | 'VALE A PENA' | 'REGULAR' | 'PREJUIZO';
  verdictColor: 'emerald' | 'teal' | 'amber' | 'rose';
  score: number; // 0 - 100
  verdictTitle: string;
  verdictReason: string[];
  badges: string[];
}

export interface CopilotConfig {
  enabled: boolean;
  minPricePerKm: number; // R$ mínimo por km total (ex: 2.20)
  minPricePerHour: number; // R$ mínimo por hora bruta (ex: 45.00)
  maxPickupDistanceKm: number; // Distância máxima aceitável para buscar (ex: 3.5 km)
  maxPickupTimeMin: number; // Tempo máximo de busca (ex: 8 min)
  minPassengerRating: number; // Nota mínima do passageiro (ex: 4.75)
  fuelConsumptionKmPerL: number; // Consumo do veículo em km/litro (ex: 10.5)
  fuelPricePerLiter: number; // Preço do litro combustível em R$ (ex: 5.89)
  maintenanceCostPerKm: number; // Custo estimado de desgaste/pneu/óleo por km (ex: 0.25)
  voiceAlerts: boolean; // Falar resumo por áudio
  soundBeep: boolean; // Tocar bipe ao chegar corrida
  autoAcceptThreshold?: 'EXCELENTE' | 'VALE A PENA' | 'OFF';
  overlayMode: 'card' | 'badge' | 'hud';
}

export const DEFAULT_COPILOT_CONFIG: CopilotConfig = {
  enabled: true,
  minPricePerKm: 2.20,
  minPricePerHour: 45.00,
  maxPickupDistanceKm: 3.5,
  maxPickupTimeMin: 8,
  minPassengerRating: 4.75,
  fuelConsumptionKmPerL: 11.0,
  fuelPricePerLiter: 5.85,
  maintenanceCostPerKm: 0.25,
  voiceAlerts: true,
  soundBeep: true,
  autoAcceptThreshold: 'OFF',
  overlayMode: 'hud',
};

/**
 * Converte string brasileira de valor para número float (ex: "R$ 24,90" -> 24.9)
 */
export function parseCurrencyStr(valStr: string): number {
  if (!valStr) return 0;
  const clean = valStr
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

/**
 * Converte string de distância em KM float (ex: "3,2 km" ou "3.2km" ou "800 m" -> km float)
 */
export function parseDistanceKm(distStr: string): number {
  if (!distStr) return 0;
  const isMeters = /m(?:etros?)?/i.test(distStr) && !/km/i.test(distStr);
  const clean = distStr.replace(/[^\d,\.]/g, '').replace(',', '.');
  const num = parseFloat(clean);
  if (isNaN(num)) return 0;
  return isMeters ? num / 1000 : num;
}

/**
 * Converte string de tempo em minutos inteiros (ex: "8 min" ou "1 h 12 min" -> minutos)
 */
export function parseDurationMin(timeStr: string): number {
  if (!timeStr) return 0;
  let totalMin = 0;
  const hourMatch = timeStr.match(/(\d+)\s*(?:h|hora|horas)/i);
  if (hourMatch) {
    totalMin += parseInt(hourMatch[1], 10) * 60;
  }
  const minMatch = timeStr.match(/(\d+)\s*(?:min|minuto|minutos|m)(?!\w)/i);
  if (minMatch) {
    totalMin += parseInt(minMatch[1], 10);
  }
  if (!hourMatch && !minMatch) {
    const rawNum = parseInt(timeStr.replace(/[^\d]/g, ''), 10);
    if (!isNaN(rawNum)) totalMin = rawNum;
  }
  return totalMin || 1;
}

/**
 * Motor Analisador e Calculador Inteligente de Corridas estilo Guigo
 */
export function calculateCopilotMetrics(
  partial: Partial<CopilotRideOffer>,
  config: CopilotConfig = DEFAULT_COPILOT_CONFIG
): CopilotRideOffer {
  const grossValue = Math.max(0, partial.grossValue || 0);
  const pickupDistanceKm = Math.max(0, partial.pickupDistanceKm || 0);
  const pickupDurationMin = Math.max(0, partial.pickupDurationMin || 0);
  const tripDistanceKm = Math.max(0, partial.tripDistanceKm || 0);
  const tripDurationMin = Math.max(1, partial.tripDurationMin || 0);

  const totalDistanceKm = Math.max(0.1, (partial.totalDistanceKm && partial.totalDistanceKm > 0)
    ? partial.totalDistanceKm
    : (pickupDistanceKm + tripDistanceKm));

  const totalDurationMin = Math.max(1, (partial.totalDurationMin && partial.totalDurationMin > 0)
    ? partial.totalDurationMin
    : (pickupDurationMin + tripDurationMin));

  // 1. Médias financeiras de rendimento
  const valuePerKmTotal = Math.round((grossValue / totalDistanceKm) * 100) / 100;
  const valuePerKmTrip = tripDistanceKm > 0 ? Math.round((grossValue / tripDistanceKm) * 100) / 100 : valuePerKmTotal;
  const valuePerMinute = Math.round((grossValue / totalDurationMin) * 100) / 100;
  const valuePerHour = Math.round((valuePerMinute * 60) * 100) / 100;

  // 2. Custos Reais de Veículo
  const fuelCostPerKm = config.fuelConsumptionKmPerL > 0
    ? config.fuelPricePerLiter / config.fuelConsumptionKmPerL
    : 0.53; // fallback ~11km/l com gas R$ 5,85
  const estimatedFuelCost = Math.round((totalDistanceKm * fuelCostPerKm) * 100) / 100;
  const estimatedMaintenanceCost = Math.round((totalDistanceKm * config.maintenanceCostPerKm) * 100) / 100;
  const estimatedTotalCost = Math.round((estimatedFuelCost + estimatedMaintenanceCost) * 100) / 100;
  const estimatedNetProfit = Math.round((grossValue - estimatedTotalCost) * 100) / 100;
  const netPerHour = Math.round(((estimatedNetProfit / totalDurationMin) * 60) * 100) / 100;

  // 3. Sistema de Pontuação e Veredito Inteligente
  const reasons: string[] = [];
  const badges: string[] = [];
  let score = 50; // base neutra

  // Avaliação por R$/KM
  if (valuePerKmTotal >= config.minPricePerKm * 1.35) {
    score += 25;
    badges.push(`R$ ${valuePerKmTotal.toFixed(2)}/km Excelente`);
    reasons.push(`Ganho de R$ ${valuePerKmTotal.toFixed(2)}/km (muito acima da meta de R$ ${config.minPricePerKm.toFixed(2)}/km)`);
  } else if (valuePerKmTotal >= config.minPricePerKm) {
    score += 15;
    badges.push(`R$ ${valuePerKmTotal.toFixed(2)}/km`);
    reasons.push(`Paga R$ ${valuePerKmTotal.toFixed(2)} por km total rodado`);
  } else if (valuePerKmTotal >= config.minPricePerKm * 0.85) {
    score -= 10;
    reasons.push(`Abaixo do ideal: Paga R$ ${valuePerKmTotal.toFixed(2)}/km (sua meta é R$ ${config.minPricePerKm.toFixed(2)})`);
  } else {
    score -= 30;
    badges.push('KM Baixo');
    reasons.push(`Prejuízo no KM: R$ ${valuePerKmTotal.toFixed(2)}/km não cobre despesas com folga`);
  }

  // Avaliação por Ganho Horário
  if (valuePerHour >= config.minPricePerHour * 1.3) {
    score += 20;
    badges.push(`R$ ${valuePerHour.toFixed(0)}/h Top`);
    reasons.push(`Rendimento projetado de R$ ${valuePerHour.toFixed(2)} por hora`);
  } else if (valuePerHour >= config.minPricePerHour) {
    score += 10;
    reasons.push(`Rendimento de R$ ${valuePerHour.toFixed(2)}/h`);
  } else {
    score -= 15;
    reasons.push(`Ganho/hora baixo (R$ ${valuePerHour.toFixed(2)}/h vs meta R$ ${config.minPricePerHour.toFixed(2)}/h)`);
  }

  // Avaliação da Distância de Busca (Embarque)
  if (pickupDistanceKm <= 1.5) {
    score += 10;
    badges.push('Busca Perto ⚡');
    reasons.push(`Passageiro muito próximo (${pickupDistanceKm.toFixed(1)} km - ${pickupDurationMin} min)`);
  } else if (pickupDistanceKm > config.maxPickupDistanceKm) {
    score -= 20;
    badges.push('Busca Longe ⚠️');
    reasons.push(`Busca excessiva: ${pickupDistanceKm.toFixed(1)} km consome tempo e combustível`);
  }

  // Avaliação de Passageiro
  if (partial.passengerRating) {
    if (partial.passengerRating >= 4.90) {
      score += 5;
      badges.push(`Nota ${partial.passengerRating.toFixed(2)} ⭐`);
    } else if (partial.passengerRating < config.minPassengerRating) {
      score -= 15;
      badges.push(`Nota Baixa (${partial.passengerRating.toFixed(2)}) ⚠️`);
      reasons.push(`Atenção: Nota do passageiro (${partial.passengerRating.toFixed(2)}) abaixo de ${config.minPassengerRating.toFixed(2)}`);
    }
  }

  // Dinâmico presente?
  if (partial.dynamicValue && partial.dynamicValue > 0) {
    score += 10;
    badges.push(`+R$ ${partial.dynamicValue.toFixed(2)} Dinâmico 🔥`);
  }

  // Limites do score
  score = Math.max(5, Math.min(99, score));

  // Veredito Final
  let verdict: CopilotRideOffer['verdict'] = 'VALE A PENA';
  let verdictColor: CopilotRideOffer['verdictColor'] = 'teal';
  let verdictTitle = 'Corrida Boa';

  if (score >= 75) {
    verdict = 'EXCELENTE';
    verdictColor = 'emerald';
    verdictTitle = '⭐ EXCELENTE CORRIDA';
  } else if (score >= 55) {
    verdict = 'VALE A PENA';
    verdictColor = 'teal';
    verdictTitle = '✅ VALE A PENA';
  } else if (score >= 40) {
    verdict = 'REGULAR';
    verdictColor = 'amber';
    verdictTitle = '⚠️ REGULAR / AVALIAR';
  } else {
    verdict = 'PREJUIZO';
    verdictColor = 'rose';
    verdictTitle = '❌ NÃO COMPENSA / RECUSAR';
  }

  return {
    id: partial.id || `copilot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    app: partial.app || 'Uber',
    category: partial.category || (partial.app === '99' ? '99Pop' : 'UberX'),
    grossValue,
    dynamicValue: partial.dynamicValue || 0,
    pickupDistanceKm,
    pickupDurationMin,
    tripDistanceKm,
    tripDurationMin,
    totalDistanceKm,
    totalDurationMin,
    pickupAddress: partial.pickupAddress || 'Local de Embarque',
    dropoffAddress: partial.dropoffAddress || 'Destino Final',
    passengerRating: partial.passengerRating,
    timestamp: partial.timestamp || new Date().toISOString(),
    rawText: partial.rawText || '',

    valuePerKmTotal,
    valuePerKmTrip,
    valuePerMinute,
    valuePerHour,
    estimatedFuelCost,
    estimatedMaintenanceCost,
    estimatedTotalCost,
    estimatedNetProfit,
    netPerHour,

    verdict,
    verdictColor,
    score,
    verdictTitle,
    verdictReason: reasons,
    badges,
  };
}

/**
 * Parser Inteligente de Texto da Tela / Notificação dos apps Uber Driver e 99 Motorista
 */
export function parseScreenOrNotificationText(
  text: string,
  detectedAppHint?: PlatformName,
  config: CopilotConfig = DEFAULT_COPILOT_CONFIG
): CopilotRideOffer | null {
  if (!text || text.trim().length < 5) return null;

  const normalized = text.replace(/\r\n/g, '\n').trim();
  const lower = normalized.toLowerCase();

  // 1. Identificar Plataforma
  let app: PlatformName = detectedAppHint || 'Uber';
  if (lower.includes('99') || lower.includes('99pop') || lower.includes('99plus') || lower.includes('99moto') || lower.includes('99negocia')) {
    app = '99';
  } else if (lower.includes('indrive') || lower.includes('in-drive')) {
    app = 'InDrive';
  } else if (lower.includes('uber') || lower.includes('uberx') || lower.includes('comfort') || lower.includes('black') || lower.includes('flash')) {
    app = 'Uber';
  }

  // 2. Identificar Categoria
  let category = app === '99' ? '99Pop' : 'UberX';
  if (lower.includes('comfort')) category = 'Uber Comfort';
  else if (lower.includes('black')) category = 'Uber Black';
  else if (lower.includes('flash')) category = 'Uber Flash';
  else if (lower.includes('99plus')) category = '99Plus';
  else if (lower.includes('99negocia')) category = '99Negocia';
  else if (lower.includes('99moto')) category = '99Moto';
  else if (lower.includes('99entrega')) category = '99Entrega';

  // 3. Extrair Valor Bruto (R$)
  let grossValue = 0;
  const valueMatches = normalized.match(/R\$\s*([\d\.,]+)/gi);
  if (valueMatches && valueMatches.length > 0) {
    // Pega o maior valor de corrida encontrado (ou primeiro)
    const values = valueMatches.map(parseCurrencyStr);
    grossValue = Math.max(...values);
  } else {
    // Tenta número solto com vírgula de moeda
    const looseNum = normalized.match(/(?:valor|ganho|preço|oferta)?[:\s]*(\d{1,3}[,\.]\d{2})/i);
    if (looseNum) {
      grossValue = parseCurrencyStr(looseNum[1]);
    }
  }

  // 4. Extrair Preço Dinâmico se houver
  let dynamicValue = 0;
  const dynamicMatch = normalized.match(/\+\s*R\$\s*([\d\.,]+)/i) || normalized.match(/din[âa]mico\s*[:\s]*R\$\s*([\d\.,]+)/i);
  if (dynamicMatch) {
    dynamicValue = parseCurrencyStr(dynamicMatch[1]);
  }

  // 5. Extrair Distância e Tempo de Busca (Embarque)
  let pickupDistanceKm = 0;
  let pickupDurationMin = 0;

  // Formato Uber: "3,2 km • 6 min" ou "3.2 km até o local • 7 min" ou "6 min (2,1 km)"
  const pickupMatch = normalized.match(/(?:at[ée]|buscar|embarque|retirada)[^\d\n]*([\d\.,]+)\s*(?:km|m)[^\d\n]*([\d]+)\s*(?:min|minutos)/i)
    || normalized.match(/([\d]+)\s*(?:min|minutos)[^\d\n]*\(([\d\.,]+)\s*(?:km|m)\)/i)
    || normalized.match(/([\d\.,]+)\s*(?:km|m)\s*(?:at[ée]\s*o\s*local|de\s*busca|embarque)[^\d\n]*([\d]+)\s*min/i);

  if (pickupMatch) {
    if (pickupMatch[0].includes('(')) {
      pickupDurationMin = parseDurationMin(pickupMatch[1]);
      pickupDistanceKm = parseDistanceKm(pickupMatch[2]);
    } else {
      pickupDistanceKm = parseDistanceKm(pickupMatch[1]);
      pickupDurationMin = parseDurationMin(pickupMatch[2]);
    }
  } else {
    // Tenta encontrar primeiros KM e Minutos do texto
    const distMatches = normalized.match(/([\d\.,]+)\s*(?:km|m\b)/gi);
    const timeMatches = normalized.match(/([\d]+)\s*(?:min|minutos|h)/gi);
    if (distMatches && distMatches.length > 1) {
      pickupDistanceKm = parseDistanceKm(distMatches[0]);
    }
    if (timeMatches && timeMatches.length > 1) {
      pickupDurationMin = parseDurationMin(timeMatches[0]);
    }
  }

  // 6. Extrair Distância e Tempo de Viagem (Desembarque)
  let tripDistanceKm = 0;
  let tripDurationMin = 0;

  const tripMatch = normalized.match(/(?:viagem|destino|desembarque|percurso)[^\d\n]*([\d\.,]+)\s*(?:km|m)[^\d\n]*([\d]+)\s*(?:min|minutos)/i)
    || normalized.match(/viagem\s*:\s*([\d\.,]+)\s*km\s*\(([\d]+)\s*min\)/i);

  if (tripMatch) {
    tripDistanceKm = parseDistanceKm(tripMatch[1]);
    tripDurationMin = parseDurationMin(tripMatch[2]);
  } else {
    const distMatches = normalized.match(/([\d\.,]+)\s*(?:km|m\b)/gi);
    const timeMatches = normalized.match(/([\d]+)\s*(?:min|minutos|h)/gi);
    if (distMatches && distMatches.length > 1) {
      tripDistanceKm = parseDistanceKm(distMatches[1]);
    } else if (distMatches && distMatches.length === 1) {
      tripDistanceKm = parseDistanceKm(distMatches[0]);
    }
    if (timeMatches && timeMatches.length > 1) {
      tripDurationMin = parseDurationMin(timeMatches[1]);
    } else if (timeMatches && timeMatches.length === 1) {
      tripDurationMin = parseDurationMin(timeMatches[0]);
    }
  }

  // 7. Extrair Nota do Passageiro
  let passengerRating: number | undefined = undefined;
  const ratingMatch = normalized.match(/(?:⭐|★|nota|avalia[çc][ãa]o)?\s*([45][,\.]\d{1,2})\s*(?:⭐|★)?/i);
  if (ratingMatch) {
    const r = parseFloat(ratingMatch[1].replace(',', '.'));
    if (r >= 3.0 && r <= 5.0) passengerRating = r;
  }

  // 8. Extrair Endereços de Embarque e Destino
  let pickupAddress = '';
  let dropoffAddress = '';

  const embarqueMatch = normalized.match(/(?:embarque|origem|buscar\s*em|partida)\s*[:\-\n]\s*([^\n\r,]+(?:,[^\n\r]+)?)/i);
  if (embarqueMatch) pickupAddress = embarqueMatch[1].trim();

  const destinoMatch = normalized.match(/(?:desembarque|destino|levar\s*em|entrega)\s*[:\-\n]\s*([^\n\r,]+(?:,[^\n\r]+)?)/i);
  if (destinoMatch) dropoffAddress = destinoMatch[1].trim();

  // Se não achou com tags explícitas, tentar linhas com palavras de endereço
  if (!pickupAddress || !dropoffAddress) {
    const lines = normalized.split('\n').map((l) => l.trim()).filter((l) => l.length > 3);
    const addressLines = lines.filter((l) =>
      /(?:rua|av\.|avenida|alameda|travessa|rodovia|bairro|shopping|aeroporto|estrada|praça)/i.test(l) &&
      !l.includes('R$') &&
      !l.includes('km')
    );
    if (addressLines.length >= 2) {
      pickupAddress = pickupAddress || addressLines[0];
      dropoffAddress = dropoffAddress || addressLines[1];
    } else if (addressLines.length === 1) {
      pickupAddress = pickupAddress || addressLines[0];
    }
  }

  if (!pickupAddress) pickupAddress = 'Embarque Próximo';
  if (!dropoffAddress) dropoffAddress = 'Destino Final';

  // Se não foi possível detectar valor e distância mínima, não é oferta válida
  if (grossValue <= 0 && tripDistanceKm <= 0) {
    return null;
  }

  // Se o valor ou km foi encontrado isolado, atribuir valores coerentes
  if (tripDistanceKm <= 0 && pickupDistanceKm > 0) {
    tripDistanceKm = pickupDistanceKm;
    pickupDistanceKm = 1.0;
  }

  return calculateCopilotMetrics(
    {
      app,
      category,
      grossValue,
      dynamicValue,
      pickupDistanceKm: pickupDistanceKm || 1.2,
      pickupDurationMin: pickupDurationMin || 4,
      tripDistanceKm: tripDistanceKm || 5.0,
      tripDurationMin: tripDurationMin || 14,
      pickupAddress,
      dropoffAddress,
      passengerRating,
      rawText: text,
    },
    config
  );
}

/**
 * Fala o resumo da corrida em voz alta para o motorista no trânsito (Web Speech API)
 */
export function speakCopilotRideSummary(offer: CopilotRideOffer) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel(); // cancela fala anterior

    const msg = new SpeechSynthesisUtterance();
    msg.lang = 'pt-BR';
    msg.rate = 1.15; // ligeiramente acelerado para não perder tempo na oferta

    const precoPorKmStr = offer.valuePerKmTotal.toFixed(2).replace('.', ' vírgula ');
    const valorBrutoStr = offer.grossValue.toFixed(2).replace('.', ' reais e ');

    let speechText = '';
    if (offer.verdict === 'EXCELENTE') {
      speechText = `Excelente corrida ${offer.app}! ${valorBrutoStr} reais. Paga ${precoPorKmStr} por quilômetro. Lucro de ${offer.estimatedNetProfit.toFixed(0)} reais!`;
    } else if (offer.verdict === 'VALE A PENA') {
      speechText = `Corrida boa ${offer.app}. ${valorBrutoStr} reais. Paga ${precoPorKmStr} por quilômetro. Total de ${offer.totalDistanceKm.toFixed(1)} quilômetros.`;
    } else if (offer.verdict === 'REGULAR') {
      speechText = `Atenção. Corrida regular. ${valorBrutoStr} reais, paga ${precoPorKmStr} por quilômetro.`;
    } else {
      speechText = `Aviso: Corrida com baixo rendimento. Paga apenas ${precoPorKmStr} por quilômetro. Não compensa!`;
    }

    msg.text = speechText;
    window.speechSynthesis.speak(msg);
  } catch (err) {
    console.warn('[Copilot Audio Error]', err);
  }
}

/**
 * Corridas simuladas para teste imediato do motorista
 */
export const SAMPLE_COPILOT_RIDES: Array<{ label: string; text: string; description: string }> = [
  {
    label: '⭐ UberX Excelente (R$ 32,50 - 8,4 km)',
    description: 'Paga R$ 3,86/km com passageiro nota 4.95 a 1.2 km de distância.',
    text: `UberX
R$ 32,50
⭐ 4.95
1,2 km até o local • 4 min
7,2 km de viagem • 16 min
Embarque: Av. Paulista, 1500 - Bela Vista
Destino: Shopping Morumbi - Brooklin`,
  },
  {
    label: '🔥 99Pop com Dinâmico (R$ 44,90 - 11 km)',
    description: '99Pop com bônus de dinâmico +R$ 6,50 e bom ganho por hora (R$ 78/h).',
    text: `99Pop
R$ 44,90
+R$ 6,50 preço dinâmico
⭐ 4.88
Buscar em 5 min (1,8 km)
Viagem: 9,2 km (24 min)
Origem: Rua Augusta, 800 - Consolação
Destino: Aeroporto de Congonhas - Vila Congonhas`,
  },
  {
    label: '❌ Uber Prejuízo - Busca Longe (R$ 9,50 - 9,8 km)',
    description: 'Armadilha comum: Busca de 4.8 km para corrida curta de 5 km pagando apenas R$ 9,50.',
    text: `UberX
R$ 9,50
⭐ 4.70
4,8 km até o local • 12 min
5,0 km de viagem • 13 min
Embarque: Estrada Velha de Campinas, 400
Destino: Terminal Central`,
  },
  {
    label: '✅ Uber Comfort Aeroporto (R$ 78,00 - 24 km)',
    description: 'Corrida longa e tranquila pagando R$ 3,25/km com excelente valor absoluto.',
    text: `Uber Comfort
R$ 78,00
⭐ 4.98
2,0 km até o local • 6 min
22,0 km de viagem • 38 min
Embarque: Rua Oscar Freire, 320 - Jardins
Destino: Aeroporto Internacional de Guarulhos - Terminal 3`,
  },
  {
    label: '⚠️ 99 Moto / Curta Centro (R$ 8,00 - 2,8 km)',
    description: 'Corrida rápida de bairro com busca a 800m.',
    text: `99Pop
R$ 8,00
⭐ 4.82
0,8 km até o local • 3 min
2,0 km de viagem • 7 min
Embarque: Praça da Sé, 10 - Centro
Destino: Rua 25 de Março, 400`,
  },
];
