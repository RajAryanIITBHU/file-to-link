import Navbar from "@/components/Navbar";
import "./globals.css";
import Aloo from "@/components/Footer";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main className="h-screen">{children}</main>
        <Aloo />
      </body>
    </html>
  );
}
