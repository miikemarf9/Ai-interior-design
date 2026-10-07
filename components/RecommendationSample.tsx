import { WhyChosen } from './WhyChosen';

export function RecommendationSample() {
  return (
    <div className="recommendationSample">
      <div className="productImageMock" aria-hidden="true">
        <div className="mockLamp" />
        <div className="mockSofa" />
        <div className="mockRug" />
      </div>
      <div className="productSampleMeta">
        <div>
          <span className="microLabel">Recommended sofa</span>
          <h3>Soft-form three-seater</h3>
          <p>Warm oatmeal · textured upholstery · 214 cm wide</p>
        </div>
        <strong className="samplePrice">£1,095</strong>
      </div>
      <div className="recommendationFooter">
        <span>Selected for this room</span>
        <WhyChosen reasons={['comfort', 'design', 'lasting-style']} />
      </div>
    </div>
  );
}
