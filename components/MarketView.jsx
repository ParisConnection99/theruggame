import Image from "next/image";

export default function MarketView() {
    return (

        <div>
        <div className="flex gap-4">
            <Image 
             src="/images/eth.webp"
             alt="market_image"
             width={60}
             height={60}
             priority
            />
            <h1 className="text-red-500">Will $TRUMP Rug in the next 20 mins?</h1>
        </div>
        <div>
            <button className="bg-green-500" >PUMP</button>
            <button className="bg-red-500">RUGG</button>
        </div>
        </div>
        
    );
}