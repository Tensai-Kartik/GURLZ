import './FoodCravings.css';

export default function FoodCravings() {
  const foods = [
    { name: 'Dark Chocolate', emoji: '🍫', partner: 'swiggy', link: 'https://www.swiggy.com' },
    { name: 'Ice Cream', emoji: '🍦', partner: 'zomato', link: 'https://www.zomato.com' },
    { name: 'Pizza', emoji: '🍕', partner: 'blinkit', link: 'https://www.blinkit.com' },
    { name: 'Fruits', emoji: '🍓', partner: 'zepto', link: 'https://www.zepto.com' },
  ];

  const handleOrder = (food: any) => {
    window.open(food.link, '_blank');
  };

  return (
    <div className="food-cravings">
      <h2 className="view-title">Food & Cravings</h2>
      <div className="foods-grid">
        {foods.map((food, idx) => (
          <div key={idx} className="food-card">
            <div className="food-emoji">{food.emoji}</div>
            <div className="food-name">{food.name}</div>
            <button
              className="food-order-button"
              onClick={() => handleOrder(food)}
            >
              Order via {food.partner}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

