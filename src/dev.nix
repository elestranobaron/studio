{ pkgs, ... }: {
  # Which nixpkgs channel to use.
  channel = "stable-24.05"; # or "unstable"

  # Use https://search.nixos.org/packages to find packages
  packages = [
    pkgs.nodejs_20 # Provides Node.js and npm
  ];

  # Sets environment variables in the workspace.
  # Secrets are managed via .env files as requested by the user.
  env = {};
  
  idx = {
    # Search for the extensions you want on https://open-vsx.org/ and use "publisher.id"
    extensions = [
      "dbaeumer.vscode-eslint",
      "esbenp.prettier-vscode",
      "bradlc.vscode-tailwindcss",
      "genkit-ai.genkit-vscode"
    ];

    # Enable previews
    previews = {
      enable = true;
      previews = {
        # Configures the web preview for the Next.js frontend
        web = {
          command = ["npm" "run" "dev"];
          manager = "web";
          env = {
            # The PORT env var is provided by IDX to expose the server
            PORT = "$PORT";
          };
        };
      };
    };

    # Workspace lifecycle hooks
    workspace = {
      # Runs when a workspace is first created
      onCreate = {
        # Install npm dependencies for both the root Next.js app and the Firebase functions
        install-deps = "npm install && (cd functions && npm install)";
        
        # Create placeholder .env files if they don't exist to guide the user
        create-env-files = ''
          # Create root .env file for the frontend
          if [ ! -f .env ]; then
            echo "NEXT_PUBLIC_APP_URL=\"http://localhost:3000\"" > .env
            echo "NEXT_PUBLIC_TURNSTILE_SITE_KEY=\"\"" >> .env
            echo "NEXT_PUBLIC_FIREBASE_API_KEY=\"\"" >> .env
            echo "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=\"\"" >> .env
            echo "NEXT_PUBLIC_FIREBASE_PROJECT_ID=\"\"" >> .env
            echo "NEXT_PUBLIC_FIREBASE_APP_ID=\"\"" >> .env
          fi
          
          # Create functions .env file for the backend
          if [ ! -f functions/.env ]; then
            echo "GEMINI_API_KEY=\"\"" > functions/.env
            echo "STRIPE_SECRET_KEY=\"\"" >> functions/.env
            echo "STRIPE_WEBHOOK_SECRET=\"\"" >> functions/.env
            echo "BREVO_API_KEY=\"\"" >> functions/.env
            echo "STRIPE_MONTHLY_PRICE_ID=\"\"" >> functions/.env
            echo "STRIPE_YEARLY_PRICE_ID=\"\"" >> functions/.env
            echo "TURNSTILE_SECRET_KEY=\"\"" >> functions/.env
          fi
        '';
      };
      
      # Runs when the workspace is (re)started
      onStart = {
        # The web preview command handles starting the dev server.
        # This hook can be used for other background tasks if needed.
      };
    };
  };
}
