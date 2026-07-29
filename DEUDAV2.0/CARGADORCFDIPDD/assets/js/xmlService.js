export async function leerArchivoXml(file) {
  const texto = await file.text();
  const xml = new DOMParser().parseFromString(texto, "application/xml");

  if (xml.querySelector("parsererror")) {
    throw new Error("El archivo no contiene XML válido.");
  }

  const comprobante = buscarNodo(xml, "Comprobante");
  const timbre = buscarNodo(xml, "TimbreFiscalDigital");
  const emisor = buscarNodo(xml, "Emisor");
  const receptor = buscarNodo(xml, "Receptor");

  if (!comprobante || !timbre || !emisor || !receptor) {
    throw new Error("El XML no contiene la estructura CFDI completa.");
  }

  const uuid = atributo(timbre, "UUID").toUpperCase().trim();
  if (!uuid) throw new Error("El CFDI no contiene UUID.");

  const tipo = atributo(comprobante, "TipoDeComprobante");
  const receptorRFC = atributo(receptor, "Rfc").toUpperCase().trim();
  const rfcEmisor = atributo(emisor, "Rfc").toUpperCase().trim();

  return {
    nombreArchivo: file.name,
    uuid,
    tipo,
    receptorRFC,
    rfcEmisor,
    datosInsert: construirDatos(xml, comprobante, timbre, emisor, receptor)
  };
}

function construirDatos(xml, c, t, e, r) {
  return {
    version: atributo(c, "Version"),
    serie: atributo(c, "Serie"),
    folio: atributo(c, "Folio"),
    fecha: atributo(c, "Fecha"),
    sello: atributo(c, "Sello"),
    forma_pago: atributo(c, "FormaPago"),
    condiciones_pago: atributo(c, "CondicionesDePago"),
    subtotal: numero(atributo(c, "SubTotal")),
    descuento: numero(atributo(c, "Descuento")),
    moneda: atributo(c, "Moneda"),
    tipo_cambio: atributo(c, "TipoCambio"),
    total: numero(atributo(c, "Total")),
    tipo_comprobante: atributo(c, "TipoDeComprobante"),
    exportacion: atributo(c, "Exportacion"),
    metodo_pago: atributo(c, "MetodoPago"),
    lugar_expedicion: atributo(c, "LugarExpedicion"),
    confirmacion: atributo(c, "Confirmacion") || null,

    rfc_emisor: atributo(e, "Rfc"),
    razon_social_emisor: atributo(e, "Nombre"),
    regimen_fiscal_emisor: atributo(e, "RegimenFiscal"),

    rfc_receptor: atributo(r, "Rfc"),
    nombre_receptor: atributo(r, "Nombre"),
    domicilio_fiscal_receptor: atributo(r, "DomicilioFiscalReceptor"),
    residencia_fiscal: atributo(r, "ResidenciaFiscal"),
    num_reg_id_trib: atributo(r, "NumRegIdTrib"),
    regimen_fiscal_receptor: atributo(r, "RegimenFiscalReceptor"),
    uso_cfdi: atributo(r, "UsoCFDI"),

    impuestos_globales: obtenerImpuestosGlobales(xml),
    fecha_certificacion: atributo(t, "FechaTimbrado"),
    no_certificado_sat: atributo(t, "NoCertificadoSAT"),
    rfc_prov_certif: atributo(t, "RfcProvCertif"),
    sello_cfd: atributo(t, "SelloCFD"),
    sello_sat: atributo(t, "SelloSAT"),

    conceptos_detalle: obtenerConceptos(xml),
    complementos: obtenerComplementos(xml),

    factura_pagada: "NO",
    factura_fisicamente: "NO",
    fotos: []
  };
}

function obtenerConceptos(xml) {
  return buscarNodos(xml, "Concepto").map(c => {
    const impuestosNodo = Array.from(c.children)
      .find(n => n.localName === "Impuestos");

    const traslados = impuestosNodo
      ? Array.from(impuestosNodo.getElementsByTagNameNS("*", "Traslado")).map(t => ({
          impuesto: atributo(t, "Impuesto"),
          tipoFactor: atributo(t, "TipoFactor"),
          tasa: numero(atributo(t, "TasaOCuota")),
          importe: numero(atributo(t, "Importe"))
        }))
      : [];

    const retenciones = impuestosNodo
      ? Array.from(impuestosNodo.getElementsByTagNameNS("*", "Retencion")).map(r => ({
          impuesto: atributo(r, "Impuesto"),
          tipoFactor: atributo(r, "TipoFactor"),
          tasa: numero(atributo(r, "TasaOCuota")),
          importe: numero(atributo(r, "Importe"))
        }))
      : [];

    return {
      claveProdServ: atributo(c, "ClaveProdServ"),
      noIdentificacion: atributo(c, "NoIdentificacion"),
      cantidad: numero(atributo(c, "Cantidad")),
      claveUnidad: atributo(c, "ClaveUnidad"),
      unidad: atributo(c, "Unidad"),
      descripcion: atributo(c, "Descripcion"),
      valorUnitario: numero(atributo(c, "ValorUnitario")),
      importe: numero(atributo(c, "Importe")),
      descuento: numero(atributo(c, "Descuento")),
      traslados,
      retenciones
    };
  });
}

function obtenerImpuestosGlobales(xml) {
  const comprobante = buscarNodo(xml, "Comprobante");
  const nodo = Array.from(comprobante.children)
    .find(n => n.localName === "Impuestos");

  const resultado = {
    detalles: [],
    total_trasladados: 0,
    total_retenidos: 0
  };

  if (!nodo) return resultado;

  for (const traslado of nodo.getElementsByTagNameNS("*", "Traslado")) {
    const importe = numero(atributo(traslado, "Importe"));
    resultado.detalles.push({
      tipo: nombreImpuesto(atributo(traslado, "Impuesto")),
      tasa: numero(atributo(traslado, "TasaOCuota")),
      importe
    });
    resultado.total_trasladados += importe;
  }

  for (const retencion of nodo.getElementsByTagNameNS("*", "Retencion")) {
    const importe = numero(atributo(retencion, "Importe"));
    resultado.detalles.push({
      tipo: nombreImpuesto(atributo(retencion, "Impuesto")),
      tasa: numero(atributo(retencion, "TasaOCuota")),
      importe
    });
    resultado.total_retenidos += importe;
  }

  return resultado;
}

function obtenerComplementos(xml) {
  const complemento = buscarNodo(xml, "Complemento");
  if (!complemento) return [];

  return Array.from(complemento.children).map(nodo => ({
    nombre: nodo.nodeName,
    atributos: Array.from(nodo.attributes).map(a => ({
      nombre: a.name,
      valor: a.value
    }))
  }));
}

function buscarNodo(xml, localName) {
  return xml.getElementsByTagNameNS("*", localName)[0] || null;
}

function buscarNodos(xml, localName) {
  return Array.from(xml.getElementsByTagNameNS("*", localName));
}

function atributo(nodo, nombre) {
  return nodo?.getAttribute(nombre) || "";
}

function numero(valor) {
  const n = Number.parseFloat(valor || "0");
  return Number.isFinite(n) ? n : 0;
}

function nombreImpuesto(codigo) {
  return codigo === "001" ? "ISR"
    : codigo === "002" ? "IVA"
    : codigo === "003" ? "IEPS"
    : codigo;
}
