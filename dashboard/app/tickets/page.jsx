import Shell from '../../components/Shell';
import TicketSupport from '../../components/TicketSupport';
import {requirePage} from '../../lib/dashboard-auth';
export default async function Tickets(){await requirePage();return <Shell><h2 className="mb-6 text-4xl font-black">Support et tickets</h2><TicketSupport/></Shell>}
