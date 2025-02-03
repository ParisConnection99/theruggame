import Image from "next/image";
import Link from "next/link";
import { Alfa_Slab_One } from "next/font/google";
import DropdownButton from "@/components/DropdownButton.js";


const alfaSlabOne = Alfa_Slab_One({ weight: "400" });

export default function Home() {
  return (
    <div>
      <main>
        <div className="w-full-[calc(100%-2rem)] h-10 bg-blue-300 flex items-center justify-center rounded-lg ml-4 mr-4 mt-4 gap-4 px-4">
          <Image
            className="rounded-full"
            src="/images/pepe.webp"
            alt="banner"
            width={25}
            height={25}
            priority
          />
          <h1 className="text-black text-sm ">
            MoneyMagnet bet 0.2 SOL on HoodAI to Rug 🚀
          </h1>
        </div>

        { /* Main Menu */}
        <div className="flex justify-between items-center w-full px-5 mt-10">
          <div className="flex gap-6">
            <button className="text-white text-md">{`<how it works>`}</button>
            <button className="text-white text-md">{`<support>`}</button>
          </div>

          <button className="text-white text-md">
            {`<connect wallet>`}
          </button>
        </div>

        { /* King Of the Trenches*/}
        <div className="flex flex-col items-center justify-center mt-20 hover:border-white">
          <h1 className={`${alfaSlabOne.className} text-3xl text-orange-500 !important`}>
            King of the Trenches
          </h1>

          <div className="flex gap-4 items-center mt-5 mr-10">
            <Image
              className="rounded-md ml-4"
              src="/images/eth.webp"
              alt="market_image"
              width={60}
              height={60}
              priority
            />
            <ol>
              <li className="text-sm text-blue-300 font-bold"> Will $Eth Coin Pump in 10 Mins?</li>
              <li className="text-xs">minutes left: 4 mins 🔥🔥</li>
              <li className="text-sm font-bold">amount wagered: 50 SOL ($10k) </li>
            </ol>
           
          </div>

        </div>

        {/* Search Market */}
        <div className="flex gap-2 items-center justify-center mt-10">
          <input type="text"
            className="w-full sm:w-1/3 bg-blue-300 text-white rounded-md h-10 p-2 ml-4 placeholder-gray-500 focus:border-white"
            placeholder="search markets">
          </input>

          <button className="bg-blue-300 text-black hover:bg-blue-500 w-20 h-10 rounded-md mr-4">
            search
          </button>

        </div>

        { /* Sorting Button*/}

        <div className="flex mt-20 ml-10 ">
          <DropdownButton />
        </div>
      </main>

    </div>
  );
}


// export default function Home() {
//   return (
//     <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
//       <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
//         <Image
//           className="dark:invert"
//           src="/next.svg"
//           alt="Next.js logo"
//           width={180}
//           height={38}
//           priority
//         />
//         <ol className="list-inside list-decimal text-sm text-center sm:text-left font-[family-name:var(--font-geist-mono)]">
//           <li className="mb-2">
//             Get started by editing{" "}
//             <code className="bg-black/[.05] dark:bg-white/[.06] px-1 py-0.5 rounded font-semibold">
//               src/app/page.js
//             </code>
//             .
//           </li>
//           <li>Save and see your changes instantly.</li>
//         </ol>

//         <div className="flex gap-4 items-center flex-col sm:flex-row">
//           <a
//             className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
//             href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
//             target="_blank"
//             rel="noopener noreferrer"
//           >
//             <Image
//               className="dark:invert"
//               src="/vercel.svg"
//               alt="Vercel logomark"
//               width={20}
//               height={20}
//             />
//             Deploy now
//           </a>
//           <a
//             className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:min-w-44"
//             href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
//             target="_blank"
//             rel="noopener noreferrer"
//           >
//             Read our docs
//           </a>
//         </div>
//       </main>
//       <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center">
//         <a
//           className="flex items-center gap-2 hover:underline hover:underline-offset-4"
//           href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
//           target="_blank"
//           rel="noopener noreferrer"
//         >
//           <Image
//             aria-hidden
//             src="/file.svg"
//             alt="File icon"
//             width={16}
//             height={16}
//           />
//           Learn
//         </a>
//         <a
//           className="flex items-center gap-2 hover:underline hover:underline-offset-4"
//           href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
//           target="_blank"
//           rel="noopener noreferrer"
//         >
//           <Image
//             aria-hidden
//             src="/window.svg"
//             alt="Window icon"
//             width={16}
//             height={16}
//           />
//           Examples
//         </a>
//         <a
//           className="flex items-center gap-2 hover:underline hover:underline-offset-4"
//           href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
//           target="_blank"
//           rel="noopener noreferrer"
//         >
//           <Image
//             aria-hidden
//             src="/globe.svg"
//             alt="Globe icon"
//             width={16}
//             height={16}
//           />
//           Go to nextjs.org →
//         </a>
//       </footer>
//     </div>
//   );
// }
