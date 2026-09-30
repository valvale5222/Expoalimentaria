import test from 'node:test';
import assert from 'node:assert/strict';
import {statuses,filterLeads,canManage,responsibleId} from '../src/commercial.js';
const leads=[
 {id:'1',owner_id:'a',empresa:'Frío Perú',created_at:'2026-09-30T02:00:00Z'},
 {id:'2',owner_id:'a',responsible_id:'b',empresa:'Agro Norte',created_at:'2026-09-30T12:00:00Z',commercial_status:'trabajo',next_action_date:'2026-10-02'},
 {id:'3',owner_id:'c',responsible_id:'b',empresa:'AGRO Sur',created_at:'2026-09-29T12:00:00Z',commercial_status:'pospuesto',next_action_date:'2026-10-02'}
];
test('Los seis estados excluyen derivado',()=>{assert.equal(statuses.length,6);assert.ok(!statuses.some(s=>s[0]==='derivado'));});
test('Leads anteriores se consideran nuevos y conservan al captador',()=>{assert.deepEqual(filterLeads(leads,{status:'nuevo'}).map(l=>l.id),['1']);assert.equal(responsibleId(leads[0]),'a');});
test('Filtros combinados por responsable, empresa, estado y fechas',()=>{assert.deepEqual(filterLeads(leads,{owner:'b',company:'aGrO',status:'trabajo',registered:'2026-09-30',due:'2026-10-02'}).map(l=>l.id),['2']);});
test('Fecha de registro se evalúa en Lima',()=>{assert.deepEqual(filterLeads(leads,{registered:'2026-09-29'}).map(l=>l.id),['1','3']);});
test('Responsable asignado y captador conservan acceso; terceros no',()=>{assert.equal(canManage(leads[1],{id:'a'},{}),true);assert.equal(canManage(leads[1],{id:'b'},{}),true);assert.equal(canManage(leads[1],{id:'c'},{}),false);assert.equal(canManage(leads[1],{id:'c'},{role:'admin'}),true);assert.equal(leads[1].owner_id,'a');});
test('Filtros sin coincidencias y limpieza',()=>{assert.equal(filterLeads(leads,{company:'inexistente'}).length,0);assert.equal(filterLeads(leads,{}).length,3);});
