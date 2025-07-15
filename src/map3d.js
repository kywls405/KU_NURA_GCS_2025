import { useEffect, useRef } from "react";

import * as maptalks from "maptalks";

/**
 * 지도를 출력하는 아름다운 함수
 * @returns 지도가 있는 div
 */
function Map(props) {
  const mapRef = useRef();
  const lineRef = useRef();

  const width = window.innerWidth > 660 ? window.innerWidth - 360 : 300;
  const height = window.innerHeight > 700 ? window.innerHeight - 80 : 620;

  // div가 생성된 후 한번 실행되는 함수
  useEffect(() => {
    // 지도
    const map = new maptalks.Map("map", {
      center: [127.205438, 34.609169],
      zoom: 17,
      pitch: 40,
      centerCross: true,
      baseLayer: new maptalks.TileLayer("tile", {
        urlTemplate: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        subdomains: ["a", "b", "c"],
      }),
    });
    mapRef.current = map;

    // 지도 위 선
    const line = new maptalks.LineString(undefined, {
      properties: {
        altitude: [],
      },
      symbol: {
        lineColor: "rgb(255, 0, 55)",
        lineWidth: 3,
      },
    });
    lineRef.current = line;

    // 지도에 선을 긋는 벡터 레이어
    new maptalks.VectorLayer("vector", line, { enableAltitude: true }).addTo(
      map
    );

    return () => {
      // 인스턴스 제거
      if (mapRef.current) {
        mapRef.current.remove();
      }
      if (lineRef.current) {
        lineRef.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (
      Array.isArray(props.coord) &&
      Array.isArray(props.alt) &&
      props.coord.length > 0 &&
      props.alt.length == props.coord.length
    ) {
      const lastidx = props.coord.length - 1;
      mapRef.current.setCenter(props.coord[lastidx]);
      lineRef.current.setCoordinates(props.coord);
      lineRef.current.setProperties({ altitude: props.alt });
    }
  }, [props.coord, props.alt]);

  return <div id="map" style={{ width: width, height: height }}></div>;
}

export default Map;
