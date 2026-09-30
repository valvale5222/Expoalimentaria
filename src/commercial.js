export const statuses = [
  ['nuevo', 'Nuevo', 'Nuevos', 'Lead registrado, todavía sin gestión comercial.'],
  ['seguimiento', 'En seguimiento', 'En seguimiento', 'Contacto iniciado, sin respuesta o acción comercial concreta.'],
  ['trabajo', 'En trabajo', 'En trabajo', 'El cliente respondió y existe una gestión activa: reunión, visita, planos o propuesta.'],
  ['pospuesto', 'Pospuesto', 'Pospuestos', 'Existe interés real, pero el proyecto se retomará posteriormente.'],
  ['perdido', 'Perdido', 'Perdidos', 'Sin respuesta tras los intentos de contacto o conversación abandonada.'],
  ['cancelado', 'Cancelado / No aplica', 'Cancelados', 'El requerimiento no corresponde, no existe proyecto o no continuará.'],
];
export const managementTypes = ['Llamada', 'WhatsApp', 'Correo', 'Reunión', 'Visita', 'Otro'];
export const statusLabel = value => statuses.find(s => s[0] === value)?.[1] || 'Nuevo';
export const responsibleId = lead => lead.responsible_id || lead.owner_id;
export const canManage = (lead, user, profile) => profile?.role === 'admin' || lead.owner_id === user?.id || responsibleId(lead) === user?.id;
export const filterLeads = (leads, filters) => leads.filter(l =>
  (!filters.status || (l.commercial_status || 'nuevo') === filters.status) &&
  (!filters.owner || responsibleId(l) === filters.owner) &&
  (!filters.company || l.empresa.toLocaleLowerCase().includes(filters.company.toLocaleLowerCase())) &&
  (!filters.registered || new Intl.DateTimeFormat('en-CA', {timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(l.created_at)) === filters.registered) &&
  (!filters.due || l.next_action_date === filters.due));
