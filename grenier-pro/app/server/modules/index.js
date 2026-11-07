// Modules métier ajoutés en 2.0. Chacun fournit :
//   schema : tables à créer (si absentes)
//   routes({ add, S, RULE, mode, x, created }) : déclare ses routes d'API
import * as qualite from './qualite.js';

const MODULES = [qualite];
export const MODULE_SCHEMAS = MODULES.map((m) => m.schema).filter(Boolean);
export const MODULE_ROUTES = MODULES.map((m) => m.routes).filter(Boolean);
