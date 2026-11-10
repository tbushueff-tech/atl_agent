# Atl Agent

Самостоятельный статический генератор с существующим оформлением Atl Agent. Полный движок перенесён без изменения вычислительной логики из [Jira Helper, коммит cae43281](https://github.com/tbushueff-tech/vibejira/tree/cae43281a0f48da1f72f8318368fcf302feac722/v2).

## Что перенесено

- Все модели продуктов: Jira Software/Core/Service Desk/Service Management, Confluence, Bamboo, Bitbucket, FishEye, Crucible, Crowd, известные и пользовательские плагины; режим Data Center.
- Исходные свойства и `Description=Unlimited license by https://zhile.io`, порядок Java HashMap(32), null-записи плагинов и каноническая TreeSet-сериализация для licenseHash.
- Опубликованный PKCS#8-ключ оригинального Atlassian-Agent Encoder, две подписи SHA1withDSA/DER, zlib, префикс, Base64 и X02/base31.
- Раздельные часы даты и ID, пустые значения и пробелы, Java UTF-8, переходы часовых зон Java 22.0.2, исторические даты и локали.
- Java Encoder, инструмент обновления таблиц зон, исходные Java fixtures и проверки совместимости.

Стили, сетка, поля, кнопки, цвета и адаптивное оформление существующего `index.html` сохранены. Обновлены поясняющие тексты и подключение движка. Server ID остаётся редактируемым. Пустое необязательное имя в форме использует email, как в Jira Helper.

Генерация выполняется полностью в браузере. Регистрация, API, Cloudflare Worker, хранилище и остальной интерфейс Jira Helper в этот репозиторий не переносятся. Исходный `vibejira` и его эталонная ветка не изменяются.

## Файлы и API

- `index.html` — существующий интерфейс Atl Agent.
- `src/generator.js`, `src/properties.js`, `src/private-key.js` — совместимые точки входа прежнего интерфейса (`generateDemoKey`, `makePropertyModel`, `serializeForSignature`, `serializeFinal`).
- `src/demo-*.js`, `src/java-*.js` — перенесённые модули движка Jira Helper.
- `src/fixtures/` — результаты оригинальных Java-классов, ключ и контейнер референса, векторы UTF-8.
- `src/java/` — Java Encoder и генератор таблиц часовых зон.
- `test/` — проверки генератора, сериализации, дат, Java interop и браузера.

Программный API сохраняет опции Jira Helper: `serverId`, `organisation`, `email`, `product`, `name`, `datacenter`, а также `now`, `idNow`, `clock`, `timeZone`, `locale` для воспроизводимого сравнения.

Референс: [Atlassian-Agent v1.3.1](https://github.com/ipwnosx/Atlassian-Agent/tree/e34cc82dc4724b66b28c9a49ee92415b7bd19261). Сравнение дат зафиксировано на Java 22.0.2. Готовые ключи разных запусков могут различаться: DSA использует случайность, а реализации DEFLATE могут выдавать разные корректные потоки.

## Запуск и проверки

```sh
python3 -m http.server 8080
```

Откройте [локальную страницу](http://localhost:8080).

```sh
npm test
npm run test:java
```

Для основных тестов требуется Node.js 22+, для Java interop также JDK 17+. В набор перенесены 56 Java-примеров свойств, 8 563 результата дат для 631 зоны и дополнительных локалей, проверка исходного ключа и оригинального Java-контейнера. Реальные внутренняя и внешняя подписи проверяются отдельно.

Браузерный тест использует Playwright и проверяет Jira/DC, пользовательский плагин, обе подписи, копирование и его запасной вариант, мобильное отображение и отсутствие внешних запросов:

```sh
npm run test:browser
```

Нужны установленный Playwright и его Chromium. Для установленного Google Chrome можно задать `ATL_BROWSER_CHANNEL=chrome`. Тест обслуживает локальные файлы через маршруты Playwright и не требует запуска HTTP-сервера.

## GitHub Pages

Сайт размещается из `main`, папки `/(root)`: [Atl Agent](https://tbushueff-tech.github.io/atl_agent/). Существующее оформление сохранено.
