pipeline {
    agent { label 'dockerlinux' }
    
    environment {
        // Cấu hình Registry và Image
        REGISTRY = 'ghcr.io'
        // Thay 'giatran' bằng GitHub username của bạn nếu khác
        IMAGE_REPO = 'giatran/drop' 
        CONTAINER_NAME = 'drop-server'
        
        // Cấu hình đường dẫn lưu data trên Server (Host)
        HOST_DATA_DIR = '/Users/giatran/drop-data'
    }

    triggers {
        // Tự động chạy khi có code mới đẩy lên nhánh chính
        githubPush()
    }

    stages {
        stage('Pull Source') {
            steps {
                sh 'git status'
            }
        }
        
        stage('Login to GHCR') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'github-registry-auth', passwordVariable: 'GH_TOKEN', usernameVariable: 'GH_USER')]) {
                    sh 'docker login ghcr.io -u "$GH_USER" -p "$GH_TOKEN"'
                }
            }
        }

        stage('Build & Push') {
            steps {
                script {
                    // Lấy Short Commit Hash để làm tag version
                    def gitCommit = sh(script: "git rev-parse --short HEAD", returnStdout: true).trim()
                    def fullImageName = "${REGISTRY}/${IMAGE_REPO}:${gitCommit}"
                    def latestImageName = "${REGISTRY}/${IMAGE_REPO}:latest"
                    
                    echo "Checking remote image: ${fullImageName}"
                    
                    // Kiểm tra xem image này đã build chưa để tránh build lại
                    def pullStatus = sh(script: "docker pull ${fullImageName} || true", returnStdout: true).trim()
                    
                    if (pullStatus.contains("Image is up to date") || pullStatus.contains("Downloaded newer image")) {
                         echo "Image ${fullImageName} exists remotely. Skipping build."
                    } else {
                        echo "Image not found remotely. Building..."
                        // Build image
                        sh "docker build -t ${fullImageName} ."
                        sh "docker tag ${fullImageName} ${latestImageName}"
                        
                        // Push lên Registry
                        echo "Pushing images..."
                        sh "docker push ${fullImageName}"
                        sh "docker push ${latestImageName}"
                    }
                }
            }
        }
        
        stage('Deploy') {
            steps {
                script {
                     def gitCommit = sh(script: "git rev-parse --short HEAD", returnStdout: true).trim()
                     def fullImageName = "${REGISTRY}/${IMAGE_REPO}:${gitCommit}"
                     
                     // Pull image mới nhất về (phòng trường hợp skip build ở trên)
                     sh "docker pull ${fullImageName}"

                     // Chuẩn bị thư mục data trên Host (quan trọng)
                     // Tạo file db trống trước nếu chưa có để Docker mount đúng là file
                     sh """
                        mkdir -p ${HOST_DATA_DIR}/uploads
                        touch ${HOST_DATA_DIR}/metadata.db
                     """

                     // Cleanup container cũ và chạy container mới
                     sh """
                     echo "Stopping old container..."
                     docker stop ${CONTAINER_NAME} || true
                     docker rm ${CONTAINER_NAME} || true
                     
                     echo "Starting new container..."
                     docker run -d --name ${CONTAINER_NAME} \
                         --restart unless-stopped \
                         -p 8000:8000 \
                         -e TZ=Asia/Ho_Chi_Minh \
                         -v ${HOST_DATA_DIR}/uploads:/app/uploads \
                         -v ${HOST_DATA_DIR}/metadata.db:/app/metadata.db \
                         ${fullImageName}
                     """
                }
            }
        }
    }
}
