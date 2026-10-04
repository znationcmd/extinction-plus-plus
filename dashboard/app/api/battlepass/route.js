import {nested} from '../../../lib/nested-route';
export const {GET,POST,PATCH,DELETE}=nested('battlepass',['levels'],{level:'integer',xp:'integer',reward:'integer',premium:'boolean'});
