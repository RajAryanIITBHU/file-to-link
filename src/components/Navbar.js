import Link from 'next/link'
import React from 'react'

const Navbar = () => {
  return (
    <div>
      <div className="w-full h-16 bg-blue-500 flex items-center justify-between p-4">
        <Link href={"/"} className="text-white text-2xl">Logo</Link>
        <div className="flex gap-4">
          <a href="#" className="text-white">Home</a>
          <Link href={"/a"} className="text-white">About</Link>
          <Link  href={"/c"} className="text-white">Contact</Link>
          <Link href={"/a/b"} className="text-white">Signin</Link>
        </div>
      </div>
    </div>
  )
}

export default Navbar
