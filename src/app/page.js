import Navbar from "@/components/Navbar";
import Image from "next/image";

export default function Home() {
  const a = new Date();
  console.log(a.toLocaleDateString());

  return (
   <div className="">

    <Navbar/>
    Home
   </div>
  );
}
