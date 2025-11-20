import './PadsMedicine.css';

export default function PadsMedicine() {
  const products = [
    { name: 'Sanitary Pads', emoji: '🩸', partner: 'blinkit', link: 'https://www.blinkit.com' },
    { name: 'Pain Relief', emoji: '💊', partner: 'zepto', link: 'https://www.zepto.com' },
    { name: 'Heating Pad', emoji: '🔥', partner: 'jiomart', link: 'https://www.jiomart.com' },
  ];

  const handleOrder = (product: any) => {
    window.open(product.link, '_blank');
  };

  return (
    <div className="pads-medicine">
      <h2 className="view-title">Pads & Medicine</h2>
      <div className="products-grid">
        {products.map((product, idx) => (
          <div key={idx} className="product-card">
            <div className="product-emoji">{product.emoji}</div>
            <div className="product-name">{product.name}</div>
            <button
              className="product-order-button"
              onClick={() => handleOrder(product)}
            >
              Order via {product.partner}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

