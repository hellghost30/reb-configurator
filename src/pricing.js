export const PRICING = {
    rangeMinMHz: 400,
    rangeMaxMHz: 6000,
    uiStepMHz: 100,
  
    modules: {
      "50W":  { label: "50 Вт",  bandwidthMHz: 100, price: 10000, Imin: 4, Imax: 5 },
      "100W": { label: "100 Вт", bandwidthMHz: 170, price: 17000, Imin: 7, Imax: 9 }
    },
  
    work: { upTo7: 20000, over7: 40000 },
    profitCoef: 0.05, // ✅ було 0.2
  
    batteries: {
      none:  { label: "Без акума / свій", price: 0, energyWh: 0 },
      "3kW": { label: "LiFePO4 3 кВт", price: 25000, energyWh: 3000 },
      "4.5kW": { label: "LiFePO4 4.5 кВт", price: 35000, energyWh: 4500 },
      "6kW": { label: "LiFePO4 6 кВт", price: 45000, energyWh: 6000 }
    },
  
    cases: {
      auto:     { label: "Автомобільний багажник", price: 10000 },
      portable: { label: "Експедиційний кейс",     price: 6000 }
    },
  
    baseIncludedCost: 6000,
  
    options: {
      charger220:   { label: "Зарядний пристрій 220В",   price: 6000 },
      charger12_24: { label: "Зарядний пристрій 12/24В", price: 5400 },
      magneticFeet: { label: "Магнітні ніжки (за шт)", price: 1300 }
    },
  
    nominalVoltage: 28
  };
  