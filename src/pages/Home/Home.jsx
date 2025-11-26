import SimpleImageHero from '../../components/Hero/SimpleImageHero';
import CategoriaShowcase from '../../components/CategoriaShowcase';
import Galeria from '../../components/Galeria';
import Hero3 from '../../components/Hero/Hero3';
import CelebrityCollaboration from '../../components/CelebrityCollaboration';
import SocialProof from '../../components/SocialProof';

const Home = () => {
  return (
    <>
      <main
        id="inicio"
        className="scroll-mt-16 pt-16 md:scroll-mt-0 md:pt-0"
      >
        <div className="md:hidden">
          <SimpleImageHero />
        </div>
        <CategoriaShowcase />

        <Galeria />

        <Hero3 />
        <CelebrityCollaboration />
        <SocialProof />
      </main>
    </>
  );
};

export default Home;