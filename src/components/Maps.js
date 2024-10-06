import React, { useEffect } from 'react'; // Импортируем useEffect

const Maps = () => {
  let mapInstance = null; // переменная для хранения инстанса карты

  const init = () => {
    const mapContainer = document.getElementById("map");

    if (mapContainer && !mapInstance) {
      // Инициализация карты
      mapInstance = new window.ymaps.Map(mapContainer, {
        center: [51.405269, 30.053668],  // Координаты Припяти
        zoom: 14,
      });

      const placemark = new window.ymaps.Placemark([51.405269, 30.053668], {
        hintContent: "Припять",
        balloonContent: "Это точка на карте Припяти",
      });

      mapInstance.geoObjects.add(placemark);
    }
  };

  const openInYandexMaps = () => {
    const coordinates = "51.405269,30.053668"; // Координаты для открытия в Яндекс Картах
    window.open(`https://yandex.ru/maps/geo/misto_prypiat/1444484334/?l=stv%2Csta&ll=30.052478%2C51.409122&panorama%5Bdirection%5D=176.057240%2C-4.637984&panorama%5Bfull%5D=true&panorama%5Bpoint%5D=30.035373%2C51.408449&panorama%5Bspan%5D=108.728295%2C60.000000&z=15`, '_blank');
  };

  useEffect(() => {
    window.ymaps.ready(init); // Инициализация карты после готовности API Yandex Maps
  }, []);

  return (
    <div style={{ textAlign: 'center' }}>
      <div id="map" style={{ width: "100%", height: "400px", marginBottom: "10px" }}></div>
      <button onClick={openInYandexMaps} style={{ padding: "10px 20px", fontSize: "16px" }}>
        Открыть в Яндекс Картах
      </button>
    </div>
  );
};

export default Maps;
