package ocean.studio.BetterArchitecture;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class BetterArchitectureApplication {

	public static void main(String[] args) {
		SpringApplication.run(BetterArchitectureApplication.class, args);
	}

}
