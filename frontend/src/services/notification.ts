class NotificationService {
    private readonly timeout = 3000;

    show(message: string, type: "success" | "error" | "info" | "warning" = "info") {
        const notification = document.createElement("div");
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
            </div>
        `;

        document.body.appendChild(notification);

        // Entry animation
        requestAnimationFrame(() => {
            notification.classList.add("show");
        });

        // Automatic removal
        setTimeout(() => {
            notification.classList.remove("show");
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, this.timeout);
    }

    success(message: string) {
        this.show(message, "success");
    }

    error(message: string) {
        this.show(message, "error");
    }

    warning(message: string) {
        this.show(message, "warning");
    }

    info(message: string) {
        this.show(message, "info");
    }
}

export const notification = new NotificationService();
