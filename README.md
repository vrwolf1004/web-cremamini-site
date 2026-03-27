# PickLayers — Themes Playground (site)

간단한 정적 데모입니다.

## 로컬 실행

### Node.js `http-server` 사용
```bash
npx http-server . -p 8000
```
브라우저에서 `http://localhost:8000` 열기

### Python 사용
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

### 직접 열기
`index.html`을 브라우저에서 직접 열어 테마와 익명 댓글 기능 확인 가능

## 배포 (GitHub Pages)

### 자동 배포 (GitHub Actions 사용)

`.github/workflows/` 폴더에 배포 스크립트를 추가하면 자동으로 `gh-pages` 브랜치에 배포됩니다.

### 수동 배포

```bash
# 1. gh-pages 브랜치 생성 (처음 한번만)
git checkout --orphan gh-pages
git rm -rf .

# 2. site 폴더의 모든 파일을 root로 복사
# (Windows PowerShell)
Copy-Item site/* -Destination . -Recurse -Force

# 3. 커밋 및 푸시
git add .
git commit -m "Deploy static site"
git push -u origin gh-pages

# 4. main 브랜치로 돌아가기
git checkout main
```

### GitHub Pages 설정
1. 레포지토리 Settings → Pages
2. Source: `gh-pages` 브랜치, `/` (root) 선택
3. Save

배포 후 `https://<username>.github.io/<repo-name>` 에서 접속 가능합니다.
