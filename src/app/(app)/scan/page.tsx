import { FileUploader } from "@/components/file-uploader";
import { SidebarTrigger } from "@/components/ui/sidebar";

export default function ScanPage() {
  return (
    <div className="flex flex-col h-full">
       <header className="flex items-center gap-4 p-4 border-b md:p-6">
        <SidebarTrigger className="md:hidden" />
        <h1 className="text-2xl font-bold tracking-tight font-headline md:text-3xl">
            Scan WOD
        </h1>
       </header>
        <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-6">
            <FileUploader />
        </main>
    </div>
  );
}
