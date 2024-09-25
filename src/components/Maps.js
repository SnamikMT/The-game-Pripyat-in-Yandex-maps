import React, { useEffect } from 'react'; // Импортируем useEffect

const Maps = () => {
  let mapInstance = null; // переменная для хранения инстанса карты

  const init = () => {
    const mapContainer = document.getElementById("map");
    const panoramaContainer = document.getElementById("panorama");

    if (mapContainer && panoramaContainer && !mapInstance) {
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

      // Проверяем поддержку панорам в браузере
      if (window.ymaps.panorama.isSupported()) {
        console.log("API поддерживает данный браузер.");

        // Получение объекта панорамы
        window.ymaps.panorama.locate([55.751244, 37.618423]).then(
          function (panoramas) {
            if (panoramas.length) {
              console.log("Ура, нашлась панорама.");
              new window.ymaps.panorama.Player(panoramaContainer, panoramas[0], {
                direction: [256, 16],
                hotkeysEnabled: true,
              });
            } else {
              console.log("Для заданной точки не найдено ни одной панорамы.");
            }
          },
          function (err) {
            console.log("При попытке получить панораму возникла ошибка: ", err);
          }
        );
      } else {
        console.log("Данный браузер не поддерживается для панорам.");
      }
    }
  };

  useEffect(() => {
    window.ymaps.ready(init); // Инициализация карты после готовности API Yandex Maps
  }, []);

  return (
    <div>
      <div id="map" style={{ width: "100%", height: "400px" }}></div>
      <div id="panorama" style={{ width: "100%", height: "400px" }}></div>
    </div>
  );
};

export default Maps;
