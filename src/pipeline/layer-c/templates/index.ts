import { informacionTemplates } from './informacion';
import { generacionTemplates } from './generacion';
import { codigoTemplates } from './codigo';
import { analisisTemplates } from './analisis';
import { razonamientoTemplates } from './razonamiento';
import { conversacionTemplates } from './conversacion';
import { accionTemplates } from './accion';
import { transformacionTemplates } from './transformacion';
import { ACADEMIC_GENERACION_TEMPLATES } from './academico-generacion';
import { ACADEMIC_ANALISIS_TEMPLATES } from './academico-analisis';
import { ACADEMIC_INFORMACION_TEMPLATES } from './academico-informacion';

export const TEMPLATE_REGISTRY: Record<string, Record<string, string>> = {
  informacion: { ...informacionTemplates, ...ACADEMIC_INFORMACION_TEMPLATES },
  generacion: { ...generacionTemplates, ...ACADEMIC_GENERACION_TEMPLATES },
  codigo: codigoTemplates,
  analisis: { ...ACADEMIC_ANALISIS_TEMPLATES, ...analisisTemplates },
  razonamiento: razonamientoTemplates,
  conversacion: conversacionTemplates,
  accion: accionTemplates,
  transformacion: transformacionTemplates,
};
