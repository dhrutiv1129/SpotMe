package com.spotme.backend;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;

@SpringBootTest
class BackendApplicationTests {

	@Autowired
	private ApplicationContext context;

	@Test
	void contextLoads() {
		assertThat(context.getBean(BackendApplication.class)).isNotNull();
	}

	@Test
	void applicationNameIsLoadedFromConfiguration() {
		assertThat(context.getEnvironment().getProperty("spring.application.name"))
				.isEqualTo("backend");
	}

}
