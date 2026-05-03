# Spectra: Requirements Traceability Board

Spectra는 엔지니어링 프로젝트의 **사용자 요구사항(UR)**, **시스템 요구사항(SR)**, 그리고 **구현 기능(Feature)** 간의 관계를 관리하고 시각화하는 경량 요구사항 추적 툴입니다.

복잡한 요구사항 간의 연결 고리를 한눈에 파악하고, 누락된 추적성(Traceability Gap)을 실시간으로 감지하여 프로젝트의 정합성을 유지하도록 돕습니다.

**Live Demo**: https://spectra-pied.vercel.app

## Demo

### Board View

<img src="docs/assets/spectra-board.png" alt="Spectra board view" width="900">

### Graph View

<img src="docs/assets/spectra-graph.png" alt="Spectra graph view" width="900">

## Key Features

- **Interactive Board**: 3단 컬럼 리스트 뷰를 통해 요구사항을 구조적으로 관리합니다.
- **Graph Visualization**: @xyflow/react(ReactFlow) 기반의 다이내믹 네트워크 그래프를 통해 복잡한 연결 관계를 탐색합니다.
- **Real-time Traceability**: 연결되지 않은 UR, 부모가 없는 SR 등 추적성 경고를 실시간으로 감지합니다.
- **Rich Metadata**: SR의 프로토콜, 데이터 포맷, 우선순위, 페이로드 스키마 등 상세 명세를 지원합니다.
- **Tags**: UR, SR, Feature에 태그를 붙여 도메인, 릴리즈, 담당 영역, 리스크 기준으로 빠르게 검색하고 분류할 수 있습니다.
- **Local-First**: 브라우저 LocalStorage에 데이터를 자동 저장하여 별도의 DB나 로그인 없이 즉시 사용 가능합니다.
- **Import/Export**: YAML 형식을 통한 프로젝트 백업/복구와 Markdown 리포트 내보내기를 지원합니다.
- **Customizable Layout**: 다크/라이트 테마 지원 및 우측 상세 패널 너비 조절 등 최적화된 UX를 제공합니다.

## How to Use

1. **요구사항 생성**: 각 컬럼의 `+ Add` 버튼을 눌러 UR, SR, Feature를 추가합니다.
2. **메타데이터 입력**: SR에는 우선순위, 프로토콜, 데이터 포맷, 페이로드 스키마를 기록할 수 있습니다.
3. **태그 지정**: `auth, security, mvp`처럼 쉼표로 구분해 태그를 입력합니다. 검색창에서 태그로도 항목을 찾을 수 있습니다.
4. **링크 연결**: 항목을 선택한 후 우측 `Links` 패널에서 관련 UR, SR, Feature를 연결합니다.
5. **무결성 검증**: 우측 `Warnings` 패널에서 추적성이 누락된 항목을 확인하고 바로 선택할 수 있습니다.
6. **뷰 전환**: 리스트 뷰와 그래프 뷰를 오가며 요구사항 연결 구조를 확인합니다.
7. **데이터 보존**: 작업 내용은 자동 저장됩니다. 다른 환경으로 옮기려면 YAML로 내보내고 다시 가져오세요.

## Data & Privacy

Spectra는 현재 LocalStorage 기반의 local-first 앱입니다.

- 별도 서버 DB나 로그인 없이 브라우저 안에 데이터를 저장합니다.
- 데이터는 브라우저와 기기별로 분리됩니다.
- 브라우저 데이터를 삭제하면 저장된 프로젝트도 사라질 수 있습니다.
- 장기 보관이나 다른 환경 이동이 필요하면 `YAML` export를 백업으로 사용하세요.
- `Markdown` export는 공유, 리뷰, 문서화용 리포트에 적합합니다.

## Local Development

```bash
git clone https://github.com/sohee-zoe/spectra.git
cd spectra
npm install
npm run dev
```

## Verification

```bash
npm test
npm run typecheck
npm run build
```

## Tech Stack

- **Core**: React 18, Vite, TypeScript
- **Styling**: Vanilla CSS
- **Graph Engine**: @xyflow/react
- **Serialization**: js-yaml
- **Drag & Drop**: @dnd-kit
