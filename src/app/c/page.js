"use client"
import React, { useState } from 'react'

const page = () => {

    const [couter, setCouter] = useState(0)
  return (
    <div>
      C Page {couter}
    </div>
  )
}

export default page
