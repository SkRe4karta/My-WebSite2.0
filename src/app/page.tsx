import HeroSection from "@/components/public/HeroSection";
import AboutSection from "@/components/public/AboutSection";
import ProjectsSection from "@/components/public/ProjectsSection";
import ContactSection from "@/components/public/ContactSection";

export default function HomePage() {
  return (
    <main className="relative mx-auto flex min-h-screen max-w-6xl w-full flex-col gap-16 px-6 py-16 md:px-10 lg:px-0 bg-[#1e1e1e]">
      <HeroSection />
      <AboutSection />
      <ProjectsSection />
      <ContactSection />
    </main>
  );
}
