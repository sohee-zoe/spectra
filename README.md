# Spectra: Requirements Traceability Board 🛰️

Spectra는 엔지니어링 프로젝트의 **사용자 요구사항(UR)**, **시스템 요구사항(SR)**, 그리고 **구현 기능(Feature)** 간의 관계를 관리하고 시각화하는 경량 요구사항 추적 툴입니다.

복잡한 요구사항 간의 연결 고리를 한눈에 파악하고, 누락된 추적성(Traceability Gap)을 실시간으로 감지하여 프로젝트의 정합성을 유지하도록 돕습니다.

## 🚀 Key Features

- **Interactive Board**: 3단 컬럼 리스트 뷰를 통해 요구사항을 구조적으로 관리합니다.
- **Graph Visualization**: @xyflow/react(ReactFlow) 기반의 다이내믹 네트워크 그래프를 통해 복잡한 연결 관계를 탐색합니다.
- **Real-time Traceability**: 연결되지 않은 UR, 부모가 없는 SR 등 추적성 경고를 실시간으로 감지합니다.
- **Rich Metadata**: SR의 프로토콜, 데이터 포맷, 우선순위, 페이로드 스키마 등 상세 명세를 지원합니다.
- **Local-First**: 브라우저 LocalStorage에 데이터를 자동 저장하여 별도의 DB나 로그인 없이 즉시 사용 가능합니다.
- **Import/Export**: YAML 형식을 통한 프로젝트 백업/복구 및 가독성 높은 Markdown 리포트 내보내기를 지원합니다.
- **Customizable Layout**: 다크/라이트 테마 지원 및 우측 상세 패널 너비 조절 등 최적화된 UX를 제공합니다.

## 🛠️ Tech Stack

- **Core**: React 18, Vite, TypeScript
- **Styling**: Vanilla CSS (Custom Premium Design System)
- **Graph Engine**: @xyflow/react
- **Serialization**: js-yaml
- **Drag & Drop**: @dnd-kit

## 📖 How to Use

1. **요구사항 생성**: 각 컬럼의 `+` 버튼을 눌러 UR, SR, Feature를 추가합니다.
2. **링크 연결**: 항목을 선택한 후 우측 'Links' 패널에서 관련 항목을 검색하여 연결합니다.
3. **무결성 검증**: 상단바의 'Warnings' 배지를 클릭해 추적성이 누락된 항목을 즉시 찾아냅니다.
4. **뷰 전환**: 보드 형태의 리스트 뷰(☷)와 네트워크 형태의 그래프 뷰(⌘)를 자유롭게 오가며 작업합니다.
5. **데이터 보존**: 작업 내용은 자동 저장됩니다. 다른 환경으로 옮기려면 `YAML ↓` 버튼으로 프로젝트를 백업하세요.

## 📦 Getting Started (Local Development)

```bash
# 저장소 클론
git clone https://github.com/sohee-zoe/spectra.git

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```