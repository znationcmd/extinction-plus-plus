import Shell from '../../components/Shell';
import BunkerNasdasReceiver from '../../components/BunkerNasdasReceiver';

export const metadata={
  title:'Bunker Nasdas | Extinction++ RSS',
  description:'Récepteur Morse des bunkers Nasdara avec capture audio du jeu, décodeur et coordonnées.'
};

export default function BunkerNasdasPage(){
  return <Shell><BunkerNasdasReceiver/></Shell>;
}
