import {nested} from '../../../lib/nested-route';
import {common} from '../../../lib/collection-route';
export const {GET,POST,PATCH,DELETE}=nested('rp',['jobs','licenses','fines','warrants','companies','properties','salaries'],{...common,salary:'integer',amount:'integer',userId:'string',reason:'string',permissions:'strings'});
