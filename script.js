document.addEventListener('DOMContentLoaded', function() {
    const slides = document.querySelectorAll('.hero-slide');
    let currentSlide = 0;
    const slideInterval = 4000; // 4초 간격

    function showNextSlide() {
        // 현재 슬라이드 제거
        slides[currentSlide].classList.remove('active');
        
        // 다음 슬라이드로 이동
        currentSlide = (currentSlide + 1) % slides.length;
        
        // 다음 슬라이드 표시
        slides[currentSlide].classList.add('active');
        
        // 이미지에 Ken Burns 효과 재적용
        const currentImage = slides[currentSlide].querySelector('.hero-image');
        currentImage.style.animation = 'none';
        // 리플로우 강제
        void currentImage.offsetWidth;
        currentImage.style.animation = 'kenBurns 4s ease-out forwards';
    }

    // 첫 번째 슬라이드 활성화
    if (slides.length > 0) {
        slides[0].classList.add('active');
    }

    // 4초마다 슬라이드 변경
    let slideTimer = setInterval(showNextSlide, slideInterval);

    // Menu Controller
    const menuController = document.getElementById('menu-controller');
    const menuContainer = document.getElementById('menu-container');
    const body = document.body;
    const heroVideo = document.getElementById('hero-menu-video');
    const heroVideoContainer = document.querySelector('.hero-video');
    const heroSlider = document.querySelector('.hero-slider');

    if (menuController && menuContainer) {
        function toggleMenu() {
            if (menuContainer.classList.contains('active')) {
                // 메뉴 닫기
                menuContainer.classList.remove('active');
                menuController.classList.remove('menu-open');
                body.classList.remove('menu-open');
                body.style.overflow = '';
                isMenuOpen = false;
                
                // 데스크탑에서만 비디오 처리
                if (window.innerWidth >= 769) {
                    // 비디오 숨기기 및 일시정지
                    if (heroVideoContainer) {
                        heroVideoContainer.classList.remove('active');
                    }
                    if (heroVideo) {
                        heroVideo.pause();
                    }
                    // 히어로 슬라이더 다시 표시
                    if (heroSlider) {
                        heroSlider.classList.remove('hidden');
                    }
                    // 헤더 다시 표시
                    if (header) {
                        header.classList.remove('hide');
                    }
                    // 슬라이더 타이머 다시 시작
                    slideTimer = setInterval(showNextSlide, slideInterval);
                }
            } else {
                // 메뉴 열기
                menuContainer.classList.add('active');
                menuController.classList.add('menu-open');
                body.classList.add('menu-open');
                body.style.overflow = 'hidden';
                isMenuOpen = true;
                
                // 데스크탑에서만 비디오 처리
                if (window.innerWidth >= 769) {
                    // 슬라이더 타이머 중지
                    clearInterval(slideTimer);
                    // 히어로 슬라이더 숨기기
                    if (heroSlider) {
                        heroSlider.classList.add('hidden');
                    }
                    // 헤더는 숨기지 않고 강제로 표시 (메뉴 컨트롤러가 보이도록)
                    if (header) {
                        header.classList.remove('hide');
                    }
                    // 비디오 표시 및 재생 (전체 화면)
                    if (heroVideoContainer) {
                        heroVideoContainer.classList.add('active');
                    }
                    if (heroVideo) {
                        heroVideo.play().catch(function(error) {
                            console.log('비디오 자동 재생 실패:', error);
                        });
                    }
                }
            }
        }

        menuController.addEventListener('click', function(e) {
            e.preventDefault();
            toggleMenu();
        });

        // ESC 키로 메뉴 닫기
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && menuContainer.classList.contains('active')) {
                toggleMenu();
            }
        });

        // 메뉴 외부 클릭 시 닫기
        document.addEventListener('click', function(e) {
            if (menuContainer.classList.contains('active') && 
                !menuContainer.contains(e.target) && 
                !menuController.contains(e.target)) {
                toggleMenu();
            }
        });

        // 모바일 닫기 버튼
        const menuCloseBtn = document.getElementById('menu-close-btn');
        if (menuCloseBtn) {
            menuCloseBtn.addEventListener('click', function(e) {
                e.preventDefault();
                toggleMenu();
            });
        }
    }

    // Product Section - 무한 스크롤
    const productList = document.getElementById('product-list');
    if (productList) {
        const wrapper = productList.querySelector('.product-section__list-wrapper');
        
        // 자동 스크롤 시작 (항상 실행)
        if (wrapper) {
            wrapper.style.animationPlayState = 'running';
        }

        // 드래그 기능
        let isDown = false;
        let startX;
        let scrollLeft;
        let currentTranslate = 0;
        let animationPaused = false;

        productList.addEventListener('mousedown', function(e) {
            // 왼쪽 버튼만 처리
            if (e.button !== 0) return;
            
            isDown = true;
            startX = e.pageX;
            if (wrapper) {
                const style = window.getComputedStyle(wrapper);
                const matrix = new DOMMatrix(style.transform);
                currentTranslate = matrix.e;
                wrapper.style.animationPlayState = 'paused';
                animationPaused = true;
                productList.style.cursor = 'grabbing';
            }
        });

        productList.addEventListener('mouseleave', function() {
            isDown = false;
            if (wrapper && !animationPaused) {
                wrapper.style.animationPlayState = 'running';
            }
            productList.style.cursor = 'grab';
        });

        // 전역 mouseup 이벤트로 처리 (마우스가 영역 밖에서 떼어져도 동작)
        document.addEventListener('mouseup', function(e) {
            // 왼쪽 버튼만 처리
            if (e.button !== 0) return;
            
            if (isDown && wrapper) {
                isDown = false;
                // 마우스를 떼면 다시 자동 스크롤 시작
                wrapper.style.animationPlayState = 'running';
                animationPaused = false;
                productList.style.cursor = 'grab';
            }
        });

        productList.addEventListener('mousemove', function(e) {
            if (!isDown || !wrapper) return;
            e.preventDefault();
            const x = e.pageX;
            const walk = (x - startX) * 2;
            const innerWidth = wrapper.querySelector('.product-section__list-inner').offsetWidth;
            let newTranslate = currentTranslate - walk;
            
            // 무한 스크롤을 위한 래핑
            if (newTranslate <= -innerWidth) {
                newTranslate += innerWidth;
            } else if (newTranslate > 0) {
                newTranslate -= innerWidth;
            }
            
            wrapper.style.transform = `translateX(${newTranslate}px)`;
        });

        // 터치 이벤트 (모바일)
        let touchStartX = 0;
        let touchStartY = 0;
        let touchStartTranslate = 0;
        let touchAnimationPaused = false;
        let touchMoved = false;

        productList.addEventListener('touchstart', function(e) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            touchMoved = false;
            if (wrapper) {
                const style = window.getComputedStyle(wrapper);
                const matrix = new DOMMatrix(style.transform);
                touchStartTranslate = matrix.e;
                wrapper.style.animationPlayState = 'paused';
                touchAnimationPaused = true;
            }
        });

        productList.addEventListener('touchmove', function(e) {
            if (!wrapper) return;
            const deltaX = Math.abs(e.touches[0].clientX - touchStartX);
            const deltaY = Math.abs(e.touches[0].clientY - touchStartY);
            
            // 수평 이동이 수직 이동보다 크면 스크롤로 간주
            if (deltaX > 10 || deltaY > 10) {
                touchMoved = true;
                e.preventDefault();
                const innerWidth = wrapper.querySelector('.product-section__list-inner').offsetWidth;
                let newTranslate = touchStartTranslate - (e.touches[0].clientX - touchStartX);
                
                // 무한 스크롤을 위한 래핑
                if (newTranslate <= -innerWidth) {
                    newTranslate += innerWidth;
                } else if (newTranslate > 0) {
                    newTranslate -= innerWidth;
                }
                
                wrapper.style.transform = `translateX(${newTranslate}px)`;
            }
        });

        productList.addEventListener('touchend', function(e) {
            if (wrapper) {
                // 터치를 떼면 다시 자동 스크롤 시작
                wrapper.style.animationPlayState = 'running';
                touchAnimationPaused = false;
                
                // 스크롤이 아닌 클릭인 경우 링크로 이동
                if (!touchMoved) {
                    const clickedItem = e.target.closest('.product-section__list-item');
                    if (clickedItem) {
                        const link = clickedItem.getAttribute('data-link');
                        if (link) {
                            window.open(link, '_blank', 'noopener,noreferrer');
                        }
                    }
                }
            }
        });
        
        // 모바일에서 이미지 클릭 이벤트 추가
        if (window.innerWidth <= 768) {
            const productItems = productList.querySelectorAll('.product-section__list-item[data-link]');
            productItems.forEach(function(item) {
                const img = item.querySelector('img');
                if (img) {
                    img.style.cursor = 'pointer';
                    img.addEventListener('click', function(e) {
                        const link = item.getAttribute('data-link');
                        if (link) {
                            window.open(link, '_blank', 'noopener,noreferrer');
                        }
                    });
                }
            });
        }
    }

    // 헤더 스크롤 시 배경색 변경 및 숨김/표시
    const header = document.getElementById('header');
    let lastScrollTop = 0;
    let scrollTimeout;
    let isMenuOpen = false;

    if (header) {
        function handleScroll() {
            // 데스크탑에서 메뉴가 열려있으면 헤더 숨김 처리 안함
            if (window.innerWidth >= 769 && isMenuOpen) {
                return;
            }
            
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            
            // 스크롤 방향 감지
            if (scrollTop > lastScrollTop && scrollTop > 100) {
                // 스크롤 내릴 때: 헤더 숨김
                header.classList.add('hide');
            } else if (scrollTop < lastScrollTop) {
                // 스크롤 올릴 때: 헤더 표시
                header.classList.remove('hide');
            }
            
            // 배경색 변경
            if (scrollTop > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
            
            lastScrollTop = scrollTop;
        }

        window.addEventListener('scroll', handleScroll, { passive: true });
        // 초기 상태 확인
        handleScroll();
    }

    // Production Process Scroll Animation
    const productionScrollContainer = document.querySelector('.production-process-scroll-container');
    const productionCards = document.querySelectorAll('.production-process-card');
    
    if (productionScrollContainer && productionCards.length > 0) {
        let currentCardIndex = 0;
        let isScrolling = false;
        let scrollThreshold = 50; // 이미지 전환에 필요한 최소 스크롤 거리
        let accumulatedScroll = 0;
        
        // 초기 상태: 첫 번째 카드 활성화
        productionCards.forEach((card, index) => {
            if (index === 0) {
                card.classList.add('production-process-card--active');
            } else {
                card.classList.remove('production-process-card--active');
            }
        });
        
        function handleWheel(e) {
            const containerRect = productionScrollContainer.getBoundingClientRect();
            const containerTop = containerRect.top;
            const containerBottom = containerRect.bottom;
            const viewportHeight = window.innerHeight;
            
            // 컨테이너가 뷰포트 안에 있는지 확인
            if (containerTop < viewportHeight && containerBottom > 0) {
                const deltaY = e.deltaY;
                
                // 마지막 이미지에서 아래로 스크롤하거나, 첫 번째 이미지에서 위로 스크롤할 때는 스크롤 허용
                if ((deltaY > 0 && currentCardIndex >= productionCards.length - 1) ||
                    (deltaY < 0 && currentCardIndex <= 0)) {
                    // 스크롤 허용 (preventDefault 호출 안 함)
                    return;
                }
                
                e.preventDefault();
                
                if (isScrolling) return;
                
                accumulatedScroll += Math.abs(deltaY);
                
                if (accumulatedScroll >= scrollThreshold) {
                    isScrolling = true;
                    accumulatedScroll = 0;
                    
                    if (deltaY > 0) {
                        // 아래로 스크롤 - 다음 이미지
                        if (currentCardIndex < productionCards.length - 1) {
                            currentCardIndex++;
                            switchCard(currentCardIndex);
                        }
                    } else {
                        // 위로 스크롤 - 이전 이미지
                        if (currentCardIndex > 0) {
                            currentCardIndex--;
                            switchCard(currentCardIndex);
                        }
                    }
                    
                    // 애니메이션 완료 후 스크롤 잠금 해제
                    setTimeout(() => {
                        isScrolling = false;
                    }, 1000); // 애니메이션 시간과 동일
                }
            }
        }
        
        function switchCard(index) {
            productionCards.forEach((card, i) => {
                if (i === index) {
                    card.classList.add('production-process-card--active');
                } else {
                    card.classList.remove('production-process-card--active');
                }
            });
        }
        
        // 휠 이벤트 리스너
        window.addEventListener('wheel', handleWheel, { passive: false });
        
        // 터치 이벤트 (모바일)
        let touchStartY = 0;
        let touchEndY = 0;
        
        window.addEventListener('touchstart', function(e) {
            const containerRect = productionScrollContainer.getBoundingClientRect();
            const containerTop = containerRect.top;
            const containerBottom = containerRect.bottom;
            const viewportHeight = window.innerHeight;
            
            if (containerTop < viewportHeight && containerBottom > 0) {
                touchStartY = e.touches[0].clientY;
            }
        }, { passive: true });
        
        window.addEventListener('touchend', function(e) {
            const containerRect = productionScrollContainer.getBoundingClientRect();
            const containerTop = containerRect.top;
            const containerBottom = containerRect.bottom;
            const viewportHeight = window.innerHeight;
            
            if (containerTop < viewportHeight && containerBottom > 0 && touchStartY !== 0) {
                touchEndY = e.changedTouches[0].clientY;
                const deltaY = touchStartY - touchEndY;
                
                if (Math.abs(deltaY) > 50 && !isScrolling) {
                    isScrolling = true;
                    e.preventDefault();
                    
                    if (deltaY > 0) {
                        // 아래로 스와이프 - 다음 이미지
                        if (currentCardIndex < productionCards.length - 1) {
                            currentCardIndex++;
                            switchCard(currentCardIndex);
                        }
                    } else {
                        // 위로 스와이프 - 이전 이미지
                        if (currentCardIndex > 0) {
                            currentCardIndex--;
                            switchCard(currentCardIndex);
                        }
                    }
                    
                    setTimeout(() => {
                        isScrolling = false;
                    }, 1000);
                }
                
                touchStartY = 0;
                touchEndY = 0;
            }
        }, { passive: false });
        
        // 리사이즈 시 재계산
        let resizeTimer;
        window.addEventListener('resize', function() {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function() {
                // 리사이즈 시 현재 활성화된 카드 유지
                switchCard(currentCardIndex);
            }, 250);
        });
    }

});

