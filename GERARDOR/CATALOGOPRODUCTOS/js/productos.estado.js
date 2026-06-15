export const state = {
  productos: [],
  filtrados: [],
  resultadosBusqueda: [],
  idxBusqueda: -1,
  productoActual: null,
  modoEditor: "editar",
  bloqueoReaperturaBuscador: false,
  coleccionProductos: "productos"
};

export const ESQUEMA_BASE = {
  activo: true,
  codigoBarra: "",
  codigosEquivalentes: [],
  concepto: "",
  marca: "",
  proveedor: "",
  departamento: "",
  departamento_id: "",
  claveSat: "",
  unidadMedidaSat: "",
  costoSinImpuesto: null,
  precioPublico: null,
  ivaTasa: 0,
  iepsTasa: 0,
  cantidadPorCaja: 1,
  mayoreo: null,
  medioMayoreo: null,
  comision_tipo: "",
  comision_valor: 0,
  preciosPorCantidad: [],
  actualizadoEn: "",
  ultima_actualizacion: "",
  updatedAt: null
};

export const ORDEN_CAMPOS = [
  "id",
  "activo",
  "codigoBarra",
  "codigosEquivalentes",
  "concepto",
  "marca",
  "proveedor",
  "departamento",
  "departamento_id",
  "claveSat",
  "unidadMedidaSat",
  "cantidadPorCaja",
  "costoSinImpuesto",
  "precioPublico",
  "mayoreo",
  "medioMayoreo",
  "ivaTasa",
  "iepsTasa",
  "comision_tipo",
  "comision_valor",
  "preciosPorCantidad",
  "actualizadoEn",
  "ultima_actualizacion",
  "updatedAt"
];

export const CAMPOS_BLOQUEADOS = ["id", "codigoBarra"];
