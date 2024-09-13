import React, { useEffect } from "react";

const Maps = () => {
  const init = () => {
    const mapContainer = document.getElementById("map");
    const panoramaContainer = document.getElementById("panorama");

    if (mapContainer && panoramaContainer) {
      // Инициализация карты
      const map = new window.ymaps.Map(mapContainer, {
        center: [51.405269, 30.053668],  // Координаты Припяти
        zoom: 14,
      });

      const placemark = new window.ymaps.Placemark([51.405269, 30.053668], {
        hintContent: "Припять",
        balloonContent: "Это точка на карте Припяти",
      });

      map.geoObjects.add(placemark);

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
    if (window.ymaps) {
      window.ymaps.ready(init);
    } else {
      const script = document.createElement("script");
      script.src = "https://api-maps.yandex.ru/2.1/?apikey=659c156d-ea1f-406f-9097-568344c88f38&lang=ru_RU";
      script.async = true;
      document.body.appendChild(script);

      script.onload = () => {
        window.ymaps.ready(init);
      };

      return () => {
        document.body.removeChild(script);
      };
    }
  }, []);

  return (
    <div>
      <h2>Карта и Панорама Припяти</h2>
      <div id="map" style={{ width: "600px", height: "400px" }}></div>
      <div id="panorama" style={{ width: "600px", height: "400px", marginTop: "20px" }}></div>
    </div>
  );
};

export default Maps;
