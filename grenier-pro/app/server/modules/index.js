// Modules métier ajoutés en 2.0. Chacun fournit :
//   schema : tables à créer (si absentes)
//   routes({ add, S, RULE, mode, x, created }) : déclare ses routes d'API
//   jobs({ S, db, x }) : tâches de fond (facultatif)
import * as qualite from './qualite.js';
import * as cloud from './cloud.js';
import * as paiements from './paiements.js';
import * as credit from './credit.js';
import * as marche from './marche.js';

const MODULES = [qualite, cloud, paiements, credit, marche];
export const MODULE_SCHEMAS = MODULES.map((m) => m.schema).filter(Boolean);
export const MODULE_ROUTES = MODULES.map((m) => m.routes).filter(Boolean);
/** Tâches de fond : jobs({ S, db, x }) retourne des minuteries. */
export const MODULE_JOBS = MODULES.map((m) => m.jobs).filter(Boolean);
