import {notFound} from 'next/navigation';
import Explorer from '../../../components/Explorer';
export default async function Page({params}){const {game}=await params;if(!['ark','palworld','aniimo','dayz'].includes(game))notFound();return <Explorer game={game}/>;}
